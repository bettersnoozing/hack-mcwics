import os
import json
import re
from flask import Flask, jsonify, request
from flask_cors import CORS
import snowflake.connector
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv('DEV_MONGO')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'mcwics-portal')
mongo_client = None
mongo_db = None

# Valid application statuses
VALID_STATUSES = ['pending', 'under_review', 'interview_scheduled', 'accepted', 'rejected', 'waitlisted', 'withdrawn']


def get_mongo_db():
    """Get MongoDB database connection."""
    global mongo_client, mongo_db
    if mongo_db is None:
        mongo_client = MongoClient(MONGO_URI)
        mongo_db = mongo_client[MONGO_DB_NAME]
    return mongo_db


def update_application(application_id: str, updates: dict, user_email: str) -> dict:
    """Update an application in MongoDB. Returns result dict."""
    try:
        db = get_mongo_db()
        
        # Verify user is admin (check both MongoDB users and demo admins)
        user = db.users.find_one({'email': user_email}, {'passwordHash': 0})
        demo_admin = DEMO_ADMINS.get(user_email)
        
        is_authorized = False
        if user:
            if 'ADMIN' in user.get('roles', []) or 'CLUB_LEADER' in user.get('roles', []):
                is_authorized = True
        elif demo_admin:
            is_authorized = True
        
        if not is_authorized:
            return {'success': False, 'error': 'Unauthorized - admin access required'}
        
        # Find the application (Handle both ObjectId and String ID)
        app_filter = None
        if ObjectId.is_valid(application_id):
            app_filter = {'_id': ObjectId(application_id)}
        else:
            app_filter = {'$or': [{'applicationId': application_id}, {'id': application_id}]}

        # Fallback: If passed an existing ObjectId string, try that too
        if not db.applications.find_one(app_filter):
            try:
                app_filter = {'_id': ObjectId(application_id)}
            except:
                pass
        
        application = db.applications.find_one(app_filter)
        if not application:
            return {'success': False, 'error': f'Application {application_id} not found'}
        
        # Validate status if being updated
        if 'status' in updates:
            new_status = updates['status'].lower().replace(' ', '_')
            if new_status not in VALID_STATUSES:
                return {'success': False, 'error': f'Invalid status. Valid statuses: {", ".join(VALID_STATUSES)}'}
            updates['status'] = new_status
        
        # Add audit trail
        updates['lastUpdatedBy'] = user_email
        updates['lastUpdatedAt'] = datetime.datetime.utcnow().isoformat()
        
        # Perform update
        result = db.applications.update_one(app_filter, {'$set': updates})
        
        if result.modified_count > 0:
            return {'success': True, 'message': 'Application updated successfully', 'updates': updates}
        else:
            # Check if it was already in that state
            if application.get('status') == updates.get('status'):
                return {'success': True, 'message': 'Application was already in that state', 'updates': updates}
            return {'success': False, 'error': 'No changes made'}
            
    except Exception as e:
        print(f"Update error: {e}")
        return {'success': False, 'error': str(e)}
def parse_update_command(message: str, applications: list) -> dict:
    """Parse a chat message to detect application update commands."""
    message_lower = message.lower()
    print(f"[DEBUG] Parsing command: '{message}' against {len(applications)} apps")
    
    # Keywords that indicate an update intent
    update_keywords = ['update', 'change', 'set', 'mark', 'move', 'reject', 'accept', 'approve', 'schedule', 'waitlist', 'review', 'under review', 'put']
    
    status_keywords = {
        'accept': 'accepted', 'accepted': 'accepted', 'approve': 'accepted', 'approved': 'accepted',
        'reject': 'rejected', 'rejected': 'rejected', 'deny': 'rejected', 'denied': 'rejected',
        'waitlist': 'waitlisted', 'waitlisted': 'waitlisted',
        'schedule': 'interview_scheduled', 'scheduled': 'interview_scheduled', 'interview': 'interview_scheduled',
        'review': 'under_review', 'under review': 'under_review',
        'pending': 'pending', 'withdraw': 'withdrawn', 'withdrawn': 'withdrawn'
    }
    
    # Check if this looks like an update command
    is_update = any(kw in message_lower for kw in update_keywords)
    if not is_update:
        return None
    
    target_app = None
    best_match_score = 0
    
    for app in applications:
        # Construct names safely
        applicant_name = (app.get('applicantName') or app.get('name') or app.get('userName') or '').lower()
        applicant_email = (app.get('applicantEmail') or app.get('email') or '').lower()
        
        match_score = 0
        
        # 1. Full name match (Strongest)
        if applicant_name and applicant_name in message_lower:
            match_score = 100
        
        # 2. Name parts (First/Last)
        elif applicant_name:
            name_parts = applicant_name.split()
            for part in name_parts:
                # FIX: Allow names length 2 or more (e.g. "Al", "Jo")
                if len(part) >= 2 and f" {part} " in f" {message_lower} ": # Boundary check
                    match_score = max(match_score, len(part) * 2)
                elif len(part) >= 2 and part in message_lower:
                    match_score = max(match_score, len(part))

        # 3. Email match
        if applicant_email and applicant_email in message_lower:
            match_score = max(match_score, 50)
        elif applicant_email:
            prefix = applicant_email.split('@')[0]
            if prefix and prefix in message_lower:
                match_score = max(match_score, len(prefix))

        if match_score > best_match_score:
            best_match_score = match_score
            target_app = app
            
    # Require a decent match to proceed (Score > 2 means at least a 3-letter match or partial)
    # FIX: Lower threshold slightly or ensure logic holds
    if not target_app or best_match_score < 2:
        # Try "Everyone but X" logic (omitted for brevity, can re-add if needed)
        pass

    if not target_app:
        print("[DEBUG] No matching application found in message.")
        return None
        
    print(f"[DEBUG] Matched application: {target_app.get('applicantName')} (Score: {best_match_score})")

    # Determine the new status
    new_status = None
    # Check longest keywords first to match "under review" before "review"
    sorted_keywords = sorted(status_keywords.items(), key=lambda x: -len(x[0]))
    for keyword, status in sorted_keywords:
        if keyword in message_lower:
            new_status = status
            break
            
    if not new_status:
        print("[DEBUG] No status keyword found.")
        return None
    
    return {
        'application': target_app,
        'new_status': new_status
    }
def populate_application(db, app):
    """Populate application with applicant name/email by looking up user."""
    app_copy = dict(app)
    app_copy['_id'] = str(app_copy.get('_id', ''))
    
    # helper to process applicant
    applicant_field = app_copy.get('applicant')
    if isinstance(applicant_field, dict):
         app_copy['applicantName'] = applicant_field.get('name', '')
         app_copy['applicantEmail'] = applicant_field.get('email', '')
    elif applicant_field:
        try:
            applicant_oid = ObjectId(applicant_field) if isinstance(applicant_field, str) else applicant_field
            applicant = db.users.find_one({'_id': applicant_oid}, {'passwordHash': 0})
            if applicant:
                app_copy['applicantName'] = applicant.get('name', '')
                app_copy['applicantEmail'] = applicant.get('email', '')
        except:
            pass

    # helper to process openRole
    role_field = app_copy.get('openRole')
    if isinstance(role_field, dict):
         app_copy['roleName'] = role_field.get('jobTitle', role_field.get('title', ''))
         app_copy['clubName'] = role_field.get('clubName', '')
    elif role_field:
        try:
            role_oid = ObjectId(role_field) if isinstance(role_field, str) else role_field
            role = db.openroles.find_one({'_id': role_oid})
            if role:
                app_copy['roleName'] = role.get('jobTitle', role.get('title', role.get('name', '')))
                app_copy['clubName'] = role.get('clubName', '')
        except:
            pass
    
    return app_copy


# Demo mode admin mappings (matches frontend DevSessionContext)
DEMO_ADMINS = {
    'admin@mcgillai.ca': {'name': 'Dr. Smith', 'clubName': 'McGill AI Society', 'clubId': 'c1'},
    'admin@hackmcgill.ca': {'name': 'Jordan Lee', 'clubName': 'HackMcGill', 'clubId': 'c2'},
    'vpinternal.csus@mcgill.ca': {'name': 'Brandon Felix', 'clubName': 'Computer Science Undergraduate Society', 'clubId': 'c3'},
    'admin@robotics.mcgill.ca': {'name': 'Prof. Chen', 'clubName': 'McGill Robotics', 'clubId': 'c4'},
    'admin@wics.mcgill.ca': {'name': 'Maria Santos', 'clubName': 'McGill Women in CS', 'clubId': 'c5'},
}


def get_mongo_context(query=None, user_email=None):
    """Query MongoDB for relevant context based on user query and user role."""
    try:
        db = get_mongo_db()
        context = {}
        
        # Get users (without sensitive data)
        users = list(db.users.find({}, {'passwordHash': 0, '_id': 0}).limit(50))
        context['users'] = users
        
        # Get clubs from MongoDB
        clubs = list(db.clubs.find({}, {'_id': 0}).limit(50))
        context['mongo_clubs'] = clubs
        
        # Get open roles/positions
        openroles = list(db.openroles.find({}, {'_id': 0}).limit(50))
        context['openroles'] = openroles
        
        # Check if user is an admin and get their club's applications
        if user_email:
            # Find the user in MongoDB
            user = db.users.find_one({'email': user_email}, {'passwordHash': 0})
            
            # Check for demo mode admin if user not found in MongoDB
            demo_admin = DEMO_ADMINS.get(user_email)
            
            if user:
                context['current_user'] = {
                    'email': user.get('email'),
                    'name': user.get('name'),
                    'roles': user.get('roles', [])
                }
                
                # If user is an admin, get applications for their clubs
                if 'ADMIN' in user.get('roles', []) or 'CLUB_LEADER' in user.get('roles', []):
                    # Find clubs where this user is admin/owner
                    # Try different possible field names for admin
                    admin_clubs = list(db.clubs.find({
                        '$or': [
                            {'adminEmail': user_email},
                            {'ownerEmail': user_email},
                            {'admin': user_email},
                            {'admins': user_email},
                            {'leaderId': str(user.get('_id'))},
                            {'adminId': str(user.get('_id'))}
                        ]
                    }))
                    
                    if admin_clubs:
                        context['admin_clubs'] = [{
                            'name': c.get('name'),
                            'slug': c.get('slug'),
                            'id': str(c.get('_id'))
                        } for c in admin_clubs]
                        
                        # Get applications for these clubs
                        club_ids_str = [str(c.get('_id')) for c in admin_clubs]
                        club_ids_obj = [c.get('_id') for c in admin_clubs]
                        club_names = [c.get('name') for c in admin_clubs]
                        club_slugs = [c.get('slug') for c in admin_clubs]
                        
                        applications_raw = list(db.applications.find({
                            '$or': [
                                # Match both string and ObjectId variants of clubId
                                {'clubId': {'$in': club_ids_str}},
                                {'clubId': {'$in': club_ids_obj}},
                                {'club': {'$in': club_names}},
                                {'clubSlug': {'$in': club_slugs}}
                            ]
                        }).limit(100))
                        
                        # Populate applicant info for each application
                        applications = [populate_application(db, app) for app in applications_raw]
                        
                        context['club_applications'] = applications
                    else:
                        # Admin but no specific club - show all applications
                        if 'ADMIN' in user.get('roles', []):
                            applications_raw = list(db.applications.find({}).limit(100))
                            applications = [populate_application(db, app) for app in applications_raw]
                            context['all_applications'] = applications
            
            elif demo_admin:
                # Demo mode: user not in MongoDB but is a recognized demo admin
                context['current_user'] = {
                    'email': user_email,
                    'name': demo_admin['name'],
                    'roles': ['ADMIN']
                }
                
                # Find clubs matching the demo admin's club
                demo_club_name = demo_admin['clubName']
                admin_clubs = list(db.clubs.find({
                    '$or': [
                        {'name': demo_club_name},
                        {'name': {'$regex': demo_club_name, '$options': 'i'}}
                    ]
                }))
                
                if admin_clubs:
                    context['admin_clubs'] = [{
                        'name': c.get('name'),
                        'slug': c.get('slug'),
                        'id': str(c.get('_id'))
                    } for c in admin_clubs]
                    
                    # Get applications for these clubs via openRoles
                    club_ids = [str(c.get('_id')) for c in admin_clubs]
                    club_ids_obj = [c.get('_id') for c in admin_clubs]
                    club_names = [c.get('name') for c in admin_clubs]
                    club_object_ids = [c.get('_id') for c in admin_clubs]
                    
                    # Find all openRoles for these clubs
                    open_roles = list(db.openroles.find({
                        '$or': [
                            {'club': {'$in': club_object_ids}},  # ObjectId reference
                            {'club': {'$in': club_ids}},  # String ID
                            {'clubId': {'$in': club_ids}},
                        ]
                    }))
                    
                    # Get role IDs
                    role_ids = [r.get('_id') for r in open_roles]
                    role_id_strs = [str(r.get('_id')) for r in open_roles]
                    
                    # Find applications that reference these openRoles
                    if role_ids:
                        applications_raw = list(db.applications.find({
                            '$or': [
                                {'openRole': {'$in': role_ids}},
                                {'openRole': {'$in': role_id_strs}},
                                {'roleId': {'$in': role_id_strs}},
                                # Match clubId stored as either ObjectId or string
                                {'clubId': {'$in': club_ids}},
                                {'clubId': {'$in': club_ids_obj}},
                                {'club': {'$in': club_names}}
                            ]
                        }).limit(100))
                    else:
                        # No roles found, try direct club match
                        applications_raw = list(db.applications.find({
                            '$or': [
                                {'clubId': {'$in': club_ids}},
                                {'clubId': {'$in': club_ids_obj}},
                                {'club': {'$in': club_names}}
                            ]
                        }).limit(100))
                    
                    applications = [populate_application(db, app) for app in applications_raw]
                    context['club_applications'] = applications
                else:
                    # Demo admin but club not found - show all applications as fallback
                    context['admin_clubs'] = [{'name': demo_club_name, 'slug': demo_club_name.lower().replace(' ', '-'), 'id': 'demo'}]
                    applications_raw = list(db.applications.find({}).limit(100))
                    applications = [populate_application(db, app) for app in applications_raw]
                    context['all_applications'] = applications
        
        return context
    except Exception as e:
        print(f"MongoDB error: {e}")
        return {'error': str(e)}

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

def get_snowflake_conn(use_db=True):
    params = dict(
        user=os.getenv('SNOWFLAKE_USER'),
        password=os.getenv('SNOWFLAKE_PASSWORD'),
        account=os.getenv('SNOWFLAKE_ACCOUNT'),
        warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
    )
    if use_db:
        params['database'] = 'MCWICS_APP'
        params['schema'] = 'PUBLIC'
    return snowflake.connector.connect(**params)


def query_snowflake(sql, params=None):
    """Run a SELECT and return list-of-dicts."""
    conn = get_snowflake_conn()
    cs = conn.cursor()
    try:
        cs.execute(sql, params)
        cols = [desc[0].lower() for desc in cs.description]
        rows = [dict(zip(cols, row)) for row in cs.fetchall()]
        return rows
    finally:
        cs.close()
        conn.close()


def execute_snowflake(sql, params=None):
    """Run a non-SELECT statement."""
    conn = get_snowflake_conn()
    cs = conn.cursor()
    try:
        cs.execute(sql, params)
    finally:
        cs.close()
        conn.close()

@app.route('/')
def hello():
    return 'Hello, World!'

@app.route('/snowflake-test')
def snowflake_test():
    try:
        ctx = snowflake.connector.connect(
            user=os.getenv('SNOWFLAKE_USER'),
            password=os.getenv('SNOWFLAKE_PASSWORD'),
            account=os.getenv('SNOWFLAKE_ACCOUNT'),
            database=os.getenv('SNOWFLAKE_DATABASE'),
            schema=os.getenv('SNOWFLAKE_SCHEMA'),
            warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
        )
        cs = ctx.cursor()
        cs.execute('SELECT CURRENT_VERSION()')
        version = cs.fetchone()
        cs.close()
        ctx.close()
        return jsonify({'snowflake_version': version[0]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/mongo-test')
def mongo_test():
    """Test MongoDB connection and return sample data."""
    try:
        db = get_mongo_db()
        # Get collection names
        collections = db.list_collection_names()
        # Get user count
        user_count = db.users.count_documents({})
        # Get sample users (without sensitive data)
        sample_users = list(db.users.find({}, {'passwordHash': 0}).limit(5))
        # Convert ObjectId to string for JSON serialization
        for user in sample_users:
            user['_id'] = str(user['_id'])
        return jsonify({
            'status': 'connected',
            'database': MONGO_DB_NAME,
            'collections': collections,
            'user_count': user_count,
            'sample_users': sample_users
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/create-snowflake-db')
def create_snowflake_db():
    db_name = os.getenv('SNOWFLAKE_DATABASE') or 'MY_NEW_DATABASE'
    try:
        ctx = snowflake.connector.connect(
            user=os.getenv('SNOWFLAKE_USER'),
            password=os.getenv('SNOWFLAKE_PASSWORD'),
            account=os.getenv('SNOWFLAKE_ACCOUNT'),
            warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
        )
        cs = ctx.cursor()
        cs.execute(f'CREATE DATABASE IF NOT EXISTS {db_name}')
        cs.close()
        ctx.close()
        return jsonify({'message': f'Database {db_name} created or already exists.'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/init-snowflake-app', methods=['POST'])
def init_snowflake_app():
    try:
        ctx = snowflake.connector.connect(
            user=os.getenv('SNOWFLAKE_USER'),
            password=os.getenv('SNOWFLAKE_PASSWORD'),
            account=os.getenv('SNOWFLAKE_ACCOUNT'),
            warehouse=os.getenv('SNOWFLAKE_WAREHOUSE'),
        )
        cs = ctx.cursor()
        # Use ACCOUNTADMIN role
        cs.execute('USE ROLE ACCOUNTADMIN')
        # Create database and schema
        cs.execute('CREATE OR REPLACE DATABASE MCWICS_APP')
        cs.execute('CREATE OR REPLACE SCHEMA MCWICS_APP.PUBLIC')
        cs.execute('USE DATABASE MCWICS_APP')
        cs.execute('USE SCHEMA PUBLIC')
        # Create clubs table
        cs.execute('''CREATE OR REPLACE TABLE clubs (
            id STRING,
            slug STRING,
            name STRING,
            description STRING,
            tags STRING,
            member_count NUMBER,
            is_recruiting BOOLEAN,
            created_at DATE
        )''')
        # Create positions table
        cs.execute('''CREATE OR REPLACE TABLE positions (
            id STRING,
            club_id STRING,
            title STRING,
            description STRING,
            requirements STRING,
            deadline DATE,
            is_open BOOLEAN,
            applicant_count NUMBER,
            created_at DATE
        )''')
        # Insert mock data into clubs
        cs.execute("""INSERT INTO clubs (id, slug, name, description, tags, member_count, is_recruiting, created_at) VALUES
        ('1','mcgill-ai','McGill AI Society','Exploring artificial intelligence through workshops, research projects, and guest lectures. Open to all faculties.','AI,Machine Learning,Research',120,TRUE,'2024-09-01'),
        ('2','hack-mcgill','HackMcGill','Organizing McHacks and other hackathon events. Join our team to help plan the largest student hackathon in Montreal!','Hackathons,Events,Development',85,TRUE,'2024-08-15'),
        ('3','csus','Computer Science Undergraduate Society','Your student government for CS. We run career fairs, tutoring, and social events.','CS,Community,Careers',200,FALSE,'2024-07-01'),
        ('4','mcgill-robotics','McGill Robotics','Design and build autonomous robots for international competitions. Mechanical, electrical, and software teams.','Robotics,Engineering,Hardware',65,TRUE,'2024-09-10'),
        ('5','mcgill-women-cs','McGill Women in CS','Supporting women and non-binary individuals in computer science through mentorship, networking, and workshops.','Diversity,CS,Mentorship',150,TRUE,'2024-08-20'),
        ('6','mcgill-horses','McGill Horses','Supporting horses and horse-like individuals through mentorship, networking, and workshops.','Diversity,CS,Mentorship',150,TRUE,'2024-08-20')

        """)
        # Insert mock data into positions
        cs.execute("""INSERT INTO positions (id, club_id, title, description, requirements, deadline, is_open, applicant_count, created_at) VALUES
        ('p1','1','Software Developer','Build and maintain internal tools and project codebases.','Python,JavaScript,Git','2025-03-15',TRUE,12,'2025-01-10'),
        ('p2','1','Workshop Coordinator','Plan and run weekly AI/ML workshops for members.','Presentation,Basic ML','2025-03-10',TRUE,8,'2025-01-10'),
        ('p3','2','Frontend Developer','Build the McHacks website and registration system.','React,TypeScript,CSS','2025-02-28',TRUE,20,'2025-01-05'),
        ('p4','6','Controls Engineer','Develop autonomous navigation and control systems for our robots.','ROS,C++/Python,Control Theory','2025-03-20',TRUE,5,'2025-01-15')
        """)
        # Create recruitment_chat_view
        cs.execute("""CREATE OR REPLACE VIEW recruitment_chat_view AS
        SELECT
          c.name            AS club_name,
          c.tags            AS club_tags,
          p.title           AS position_title,
          p.description     AS position_description,
          p.requirements    AS requirements,
          p.deadline        AS deadline,
          p.is_open         AS is_open,
          p.applicant_count AS applicant_count
        FROM clubs c
        JOIN positions p
          ON c.id = p.club_id
        """)
        # Query the view
        cs.execute('SELECT * FROM recruitment_chat_view')
        rows = cs.fetchall()
        cs.close()
        ctx.close()
        return jsonify({'recruitment_chat_view': rows})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


#  CLUBS


# GET /clubs  – list all clubs, optional filters
@app.route('/clubs')
def get_clubs():
    tag = request.args.get('tag')
    recruiting = request.args.get('recruiting')
    min_members = request.args.get('min_members')

    # Prioritize MongoDB
    try:
        db = get_mongo_db()
        query = {}
        if tag:
            query['tags'] = {'$regex': tag, '$options': 'i'}
        if recruiting is not None:
            query['isRecruiting'] = recruiting.lower() == 'true'
        
        mongo_clubs = list(db.clubs.find(query))
        
        clubs = []
        for c in mongo_clubs:
            member_count = c.get('memberCount', c.get('member_count', 0))
            if min_members and member_count < int(min_members):
                continue
            clubs.append({
                'id': str(c.get('_id')),
                'slug': c.get('slug', ''),
                'name': c.get('name', ''),
                'description': c.get('description', ''),
                'tags': c.get('tags', ''),
                'member_count': member_count,
                'is_recruiting': c.get('isRecruiting', c.get('is_recruiting', False)),
                'created_at': str(c.get('createdAt', c.get('created_at', ''))),
                'logo': c.get('logo', ''),
            })
        
        if clubs:
            return jsonify(clubs)
    except Exception as e:
        print(f"MongoDB clubs error: {e}")
    
    # Fallback to Snowflake
    sql = 'SELECT * FROM clubs WHERE 1=1'
    if tag:
        sql += f" AND LOWER(tags) LIKE '%{tag.lower()}%'"
    if recruiting is not None:
        sql += f" AND is_recruiting = {'TRUE' if recruiting.lower() == 'true' else 'FALSE'}"
    if min_members:
        sql += f" AND member_count >= {int(min_members)}"
    try:
        return jsonify(query_snowflake(sql))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# GET /clubs/<slug>  – single club by slug
@app.route('/clubs/<slug>')
def get_club(slug):
    # Prioritize MongoDB
    try:
        db = get_mongo_db()
        c = db.clubs.find_one({'$or': [{'slug': slug}, {'name': {'$regex': f'^{slug}$', '$options': 'i'}}]})
        if c:
            return jsonify({
                'id': str(c.get('_id')),
                'slug': c.get('slug', ''),
                'name': c.get('name', ''),
                'description': c.get('description', ''),
                'tags': c.get('tags', ''),
                'member_count': c.get('memberCount', c.get('member_count', 0)),
                'is_recruiting': c.get('isRecruiting', c.get('is_recruiting', False)),
                'created_at': str(c.get('createdAt', c.get('created_at', ''))),
                'logo': c.get('logo', ''),
            })
    except Exception as e:
        print(f"MongoDB club error: {e}")
    
    # Fallback to Snowflake
    try:
        rows = query_snowflake("SELECT * FROM clubs WHERE slug = %s", (slug,))
        if not rows:
            return jsonify({'error': 'Club not found'}), 404
        return jsonify(rows[0])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# GET /clubs/<club_slug>/positions  – positions for a club
@app.route('/clubs/<club_slug>/positions')
def get_club_positions(club_slug):
    # Prioritize MongoDB openroles
    try:
        db = get_mongo_db()
        club = db.clubs.find_one({'$or': [{'slug': club_slug}, {'name': {'$regex': club_slug, '$options': 'i'}}]})
        if club:
            club_id_str = str(club.get('_id'))
            
            roles = list(db.openroles.find({
                '$or': [
                    {'club': club.get('_id')},
                    {'club': club_id_str},
                    {'clubId': club_id_str},
                ]
            }))
            
            positions = []
            for role in roles:
                positions.append({
                    'id': str(role.get('_id')),
                    'clubId': club_id_str,
                    'title': role.get('jobTitle') or role.get('title') or role.get('name', ''),
                    'description': role.get('description', ''),
                    'requirements': role.get('requirements', []),
                    'deadline': str(role.get('deadline', '')),
                    'is_open': role.get('isOpen', True),
                    'applicant_count': role.get('applicantCount', 0),
                    'created_at': str(role.get('createdAt', '')),
                })
            
            if positions:
                return jsonify(positions)
    except Exception as e:
        print(f"MongoDB positions error: {e}")
    
    # Fallback to Snowflake
    try:
        club_rows = query_snowflake("SELECT id FROM clubs WHERE slug = %s", (club_slug,))
        if club_rows:
            club_id = club_rows[0]['id']
            positions = query_snowflake("SELECT * FROM positions WHERE club_id = %s", (club_id,))
            return jsonify(positions)
        return jsonify([])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# POST /clubs  – create a new club
@app.route('/clubs', methods=['POST'])
def create_club():
    data = request.json
    try:
        execute_snowflake(
            """INSERT INTO clubs (id, slug, name, description, tags, member_count, is_recruiting, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, CURRENT_DATE)""",
            (data['id'], data['slug'], data['name'], data.get('description', ''),
             data.get('tags', ''), data.get('member_count', 0), data.get('is_recruiting', False))
        )
        return jsonify({'message': f"Club '{data['name']}' created."}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# PUT /clubs/<slug>  – update a club
@app.route('/clubs/<slug>', methods=['PUT'])
def update_club(slug):
    data = request.json
    try:
        execute_snowflake(
            """UPDATE clubs SET name=%s, description=%s, tags=%s,
               member_count=%s, is_recruiting=%s WHERE slug=%s""",
            (data['name'], data.get('description', ''), data.get('tags', ''),
             data.get('member_count', 0), data.get('is_recruiting', False), slug)
        )
        return jsonify({'message': f"Club '{slug}' updated."})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# DELETE /clubs/<slug>  – delete a club
@app.route('/clubs/<slug>', methods=['DELETE'])
def delete_club(slug):
    try:
        execute_snowflake("DELETE FROM clubs WHERE slug = %s", (slug,))
        return jsonify({'message': f"Club '{slug}' deleted."})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


#  POSITIONS

# GET /positions  – list positions, optional filters
@app.route('/positions')
def get_positions():
    club_id = request.args.get('club_id')
    is_open = request.args.get('is_open')

    # Prioritize MongoDB openroles
    try:
        db = get_mongo_db()
        query = {}
        if club_id:
            try:
                query['$or'] = [{'club': ObjectId(club_id)}, {'club': club_id}, {'clubId': club_id}]
            except:
                query['$or'] = [{'club': club_id}, {'clubId': club_id}]
        if is_open is not None:
            query['isOpen'] = is_open.lower() == 'true'
        
        roles = list(db.openroles.find(query))
        positions = []
        for role in roles:
            club_ref = role.get('club')
            club_id_str = str(club_ref) if club_ref else ''
            positions.append({
                'id': str(role.get('_id')),
                'club_id': club_id_str,
                'title': role.get('jobTitle') or role.get('title') or role.get('name', ''),
                'description': role.get('description', ''),
                'requirements': role.get('requirements', []),
                'deadline': str(role.get('deadline', '')),
                'is_open': role.get('isOpen', True),
                'applicant_count': role.get('applicantCount', 0),
                'created_at': str(role.get('createdAt', '')),
            })
        
        if positions:
            return jsonify(positions)
    except Exception as e:
        print(f"MongoDB positions error: {e}")
    
    # Fallback to Snowflake
    sql = 'SELECT * FROM positions WHERE 1=1'
    if club_id:
        sql += f" AND club_id = '{club_id}'"
    if is_open is not None:
        sql += f" AND is_open = {'TRUE' if is_open.lower() == 'true' else 'FALSE'}"
    try:
        return jsonify(query_snowflake(sql))
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# GET /positions/<position_id>  – single position
@app.route('/positions/<position_id>')
def get_position(position_id):
    # Prioritize MongoDB openroles
    try:
        db = get_mongo_db()
        role = None
        try:
            role = db.openroles.find_one({'_id': ObjectId(position_id)})
        except:
            pass
        
        if role:
            club_ref = role.get('club')
            club_id_str = str(club_ref) if club_ref else ''
            return jsonify({
                'id': str(role.get('_id')),
                'club_id': club_id_str,
                'title': role.get('jobTitle') or role.get('title') or role.get('name', ''),
                'description': role.get('description', ''),
                'requirements': role.get('requirements', []),
                'deadline': str(role.get('deadline', '')),
                'is_open': role.get('isOpen', True),
                'applicant_count': role.get('applicantCount', 0),
                'created_at': str(role.get('createdAt', '')),
            })
    except Exception as e:
        print(f"MongoDB position error: {e}")
    
    # Fallback to Snowflake
    try:
        rows = query_snowflake("SELECT * FROM positions WHERE id = %s", (position_id,))
        if not rows:
            return jsonify({'error': 'Position not found'}), 404
        return jsonify(rows[0])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# GET /positions/<position_id>/form-schema  – get application form schema
@app.route('/positions/<position_id>/form-schema')
def get_form_schema(position_id):
    """Get application form schema for a position."""
    try:
        db = get_mongo_db()
        
        # Try to find the open role in MongoDB
        role = None
        try:
            role = db.openroles.find_one({'_id': ObjectId(position_id)})
        except:
            pass
        
        if not role:
            # Check Snowflake positions
            rows = query_snowflake("SELECT * FROM positions WHERE id = %s", (position_id,))
            if rows:
                # Return a default form schema based on Snowflake position
                pos = rows[0]
                return jsonify({
                    'id': f'fs-{position_id}',
                    'positionId': position_id,
                    'questions': [
                        {'id': 'q1', 'label': 'Why do you want to join?', 'type': 'long_text', 'required': True, 'placeholder': 'Tell us about your motivation...'},
                        {'id': 'q2', 'label': 'Relevant experience?', 'type': 'long_text', 'required': True, 'placeholder': 'Describe your relevant skills and experience...'},
                    ],
                    'updatedAt': pos.get('created_at', '')
                })
            return jsonify({'error': 'Position not found'}), 404
        
        # Build form schema from MongoDB openRole
        questions = []
        app_questions = role.get('applicationQuestions', [])
        
        for i, q in enumerate(app_questions):
            questions.append({
                'id': f'q{i+1}',
                'label': q if isinstance(q, str) else q.get('label', q.get('question', '')),
                'type': 'long_text',
                'required': True,
                'placeholder': f'Enter your answer...'
            })
        
        # Add default questions if none exist
        if not questions:
            questions = [
                {'id': 'q1', 'label': 'Why do you want to join?', 'type': 'long_text', 'required': True, 'placeholder': 'Tell us about your motivation...'},
                {'id': 'q2', 'label': 'Relevant experience?', 'type': 'long_text', 'required': True, 'placeholder': 'Describe your relevant skills and experience...'},
            ]
        
        return jsonify({
            'id': f'fs-{position_id}',
            'positionId': position_id,
            'questions': questions,
            'updatedAt': str(role.get('updatedAt', role.get('createdAt', '')))
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# POST /positions  – create a new position
@app.route('/positions', methods=['POST'])
def create_position():
    data = request.json
    try:
        execute_snowflake(
            """INSERT INTO positions (id, club_id, title, description, requirements, deadline, is_open, applicant_count, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, CURRENT_DATE)""",
            (data['id'], data['club_id'], data['title'], data.get('description', ''),
             data.get('requirements', ''), data.get('deadline'), data.get('is_open', True),
             data.get('applicant_count', 0))
        )
        return jsonify({'message': f"Position '{data['title']}' created."}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# DELETE /positions/<position_id>  – delete a position
@app.route('/positions/<position_id>', methods=['DELETE'])
def delete_position(position_id):
    try:
        execute_snowflake("DELETE FROM positions WHERE id = %s", (position_id,))
        return jsonify({'message': f"Position '{position_id}' deleted."})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

#  RECRUITMENT VIEW  (read-only, joins clubs + positions)

@app.route('/recruitment')
def get_recruitment():
    try:
        return jsonify(query_snowflake('SELECT * FROM recruitment_chat_view'))
    except Exception as e:
        return jsonify({'error': str(e)}), 500

#  SEARCH  – full-text style search across clubs & positions
@app.route('/search')
def search():
    q = request.args.get('q', '')
    if not q:
        return jsonify({'error': 'Query param ?q= is required'}), 400
    like = f"%{q}%"
    try:
        clubs = query_snowflake(
            "SELECT * FROM clubs WHERE LOWER(name) LIKE LOWER(%s) OR LOWER(tags) LIKE LOWER(%s) OR LOWER(description) LIKE LOWER(%s)",
            (like, like, like)
        )
        positions = query_snowflake(
            "SELECT * FROM positions WHERE LOWER(title) LIKE LOWER(%s) OR LOWER(requirements) LIKE LOWER(%s) OR LOWER(description) LIKE LOWER(%s)",
            (like, like, like)
        )
        return jsonify({'clubs': clubs, 'positions': positions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

#  ANALYTICS / STATS

@app.route('/stats')
def stats():
    try:
        club_count = query_snowflake('SELECT COUNT(*) AS count FROM clubs')[0]['count']
        recruiting_count = query_snowflake('SELECT COUNT(*) AS count FROM clubs WHERE is_recruiting = TRUE')[0]['count']
        position_count = query_snowflake('SELECT COUNT(*) AS count FROM positions')[0]['count']
        open_positions = query_snowflake('SELECT COUNT(*) AS count FROM positions WHERE is_open = TRUE')[0]['count']
        total_applicants = query_snowflake('SELECT COALESCE(SUM(applicant_count),0) AS total FROM positions')[0]['total']
        top_clubs = query_snowflake('SELECT name, member_count FROM clubs ORDER BY member_count DESC LIMIT 5')
        upcoming_deadlines = query_snowflake(
            "SELECT p.title, c.name AS club_name, p.deadline FROM positions p JOIN clubs c ON p.club_id = c.id WHERE p.is_open = TRUE ORDER BY p.deadline ASC LIMIT 5"
        )
        return jsonify({
            'total_clubs': club_count,
            'recruiting_clubs': recruiting_count,
            'total_positions': position_count,
            'open_positions': open_positions,
            'total_applicants': total_applicants,
            'top_clubs_by_members': top_clubs,
            'upcoming_deadlines': upcoming_deadlines,
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500



#  RECOMMENDATIONS  – suggest clubs based on interest tags

@app.route('/recommend')
def recommend():
    interests = request.args.get('interests', '')
    if not interests:
        return jsonify({'error': 'Provide ?interests=tag1,tag2'}), 400
    tags = [t.strip() for t in interests.split(',')]
    conditions = " OR ".join([f"LOWER(tags) LIKE '%{t.lower()}%'" for t in tags])
    try:
        clubs = query_snowflake(f"SELECT * FROM clubs WHERE ({conditions}) AND is_recruiting = TRUE")
        positions = query_snowflake(
            f"SELECT p.*, c.name AS club_name FROM positions p JOIN clubs c ON p.club_id = c.id WHERE ({conditions}) AND p.is_open = TRUE"
        )
        return jsonify({'recommended_clubs': clubs, 'recommended_positions': positions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


#  CHATBOT - Snowflake Cortex with Mistral

# Store chat history per session (in production, use Redis or database)
chat_sessions = {}

def get_club_context():
    """Get current club and position data as context for the LLM."""
    try:
        clubs = query_snowflake('SELECT name, slug, description, tags, member_count, is_recruiting FROM clubs')
        positions = query_snowflake('''
            SELECT p.title, p.description, p.requirements, p.deadline, p.is_open, p.applicant_count, c.name as club_name
            FROM positions p 
            JOIN clubs c ON p.club_id = c.id
        ''')
        return {
            'clubs': clubs,
            'positions': positions
        }
    except Exception as e:
        return {'error': str(e)}


def build_system_prompt(context, mongo_context=None):
    """Build system prompt with current data context from Snowflake and MongoDB."""
    clubs_str = json.dumps(context.get('clubs', []), indent=2, default=str)
    positions_str = json.dumps(context.get('positions', []), indent=2, default=str)
    
    # Add MongoDB context if available
    mongo_section = ""
    admin_section = ""
    
    if mongo_context:
        # Current user info
        if 'current_user' in mongo_context:
            user = mongo_context['current_user']
            mongo_section += f"\n\nCurrent user: {user.get('name', 'Unknown')} ({user.get('email')}) - Roles: {', '.join(user.get('roles', []))}"
        
        if 'users' in mongo_context and mongo_context['users']:
            users_str = json.dumps(mongo_context['users'], indent=2, default=str)
            mongo_section += f"\n\nRegistered users on the platform (from MongoDB):\n{users_str}"
        if 'mongo_clubs' in mongo_context and mongo_context['mongo_clubs']:
            mongo_clubs_str = json.dumps(mongo_context['mongo_clubs'], indent=2, default=str)
            mongo_section += f"\n\nClubs data (from MongoDB):\n{mongo_clubs_str}"
        if 'openroles' in mongo_context and mongo_context['openroles']:
            openroles_str = json.dumps(mongo_context['openroles'], indent=2, default=str)
            mongo_section += f"\n\nOpen roles/positions (from MongoDB):\n{openroles_str}"
        
        # Admin-specific: applications to their clubs
        if 'admin_clubs' in mongo_context:
            admin_clubs_str = json.dumps(mongo_context['admin_clubs'], indent=2, default=str)
            admin_section += f"\n\n=== ADMIN ACCESS ===\nYou are an admin for these clubs:\n{admin_clubs_str}"
            
            if 'club_applications' in mongo_context and mongo_context['club_applications']:
                apps_str = json.dumps(mongo_context['club_applications'], indent=2, default=str)
                admin_section += f"\n\nApplications to your clubs:\n{apps_str}"
            else:
                admin_section += "\n\nNo applications found for your clubs yet."
        
        # Global admin: all applications
        if 'all_applications' in mongo_context and mongo_context['all_applications']:
            apps_str = json.dumps(mongo_context['all_applications'], indent=2, default=str)
            admin_section += f"\n\n=== ADMIN ACCESS ===\nAll applications on the platform:\n{apps_str}"
    
    return f"""You are a helpful assistant for McGill University's club recruitment platform.
You help students find clubs and positions that match their interests.

Here is the current data about clubs (from Snowflake):
{clubs_str}

Here are the current open positions (from Snowflake):
{positions_str}{mongo_section}{admin_section}

Guidelines:
- Be friendly and helpful
- Format responses in a clear, readable way
- When recommending clubs, explain why they might be a good fit
- Always mention relevant deadlines for positions
- If a user asks about applying, guide them but note you cannot submit applications for them
- Keep responses concise but informative
- You have access to data from both Snowflake and MongoDB - use it to provide accurate, personalized responses
- If the user is an admin and asks about "applications" (student submissions), ONLY show data from the "Applications to your clubs" section. DO NOT show "Open roles/positions" as if they were applications. Open roles are what students apply TO. Applications are what students HAVE SUBMITTED.
- Never include the raw JSON data (arrays or objects) from this prompt in your replies. Use it only as internal context, and respond in natural language summaries and bullet points.
- Do not wrap data in code blocks or start responses with '[' or '{'.
- For admin users, you can summarize application stats, list applicants, and provide insights about applications

ADMIN UPDATE CAPABILITIES:
IMPORTANT: You have the ability to update application statuses in real-time. When an admin asks to update an application status, THE SYSTEM AUTOMATICALLY PROCESSES THE REQUEST. You should:
1. Confirm the action was performed (the system handles it - don't say you can't do it)
2. Summarize what was changed
3. Offer any follow-up assistance

Example user commands you can process:
- "Accept the application from John Smith" 
- "Reject Alice's application"
- "Put brandon as rejected"
- "Move Bob to the interview stage"
- "Waitlist the application from jane@email.com"

Valid statuses: pending, under_review, interview_scheduled, accepted, rejected, waitlisted, withdrawn

When a status update is requested, the system will automatically update the database and prepend a confirmation message. Simply acknowledge the change and offer to help with anything else."""


def call_cortex_llm(prompt, conversation_history=None):
    """Call Snowflake Cortex COMPLETE function with Mistral."""
    conn = get_snowflake_conn()
    cs = conn.cursor()
    
    try:
        # Builds the full prompt with conversation history
        full_prompt = ""
        if conversation_history:
            for msg in conversation_history:
                role = "User" if msg['role'] == 'user' else "Assistant"
                full_prompt += f"{role}: {msg['content']}\n\n"
        full_prompt += f"User: {prompt}\n\nAssistant:"
        
        sql = """
        SELECT SNOWFLAKE.CORTEX.COMPLETE(
            'mistral-large',
            %s
        ) AS response
        """
        
        cs.execute(sql, (full_prompt,))
        result = cs.fetchone()
        
        if result and result[0]:
            # Simple string format returns plain text
            return str(result[0])
        return "Sorry, I couldn't generate a response."
        
    finally:
        cs.close()
        conn.close()


@app.route('/chat', methods=['POST'])
def chat():
    """Chat endpoint."""
    try:
        data = request.json
        user_message = data.get('message', '')
        session_id = data.get('session_id', 'default')
        user_email = data.get('user_email')
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # 1. Initialize Session
        if session_id not in chat_sessions:
            chat_sessions[session_id] = {
                'history': [],
                'context': {}, # Lazy load snowflake if needed
                'mongo_context': get_mongo_context(user_message, user_email),
                'user_email': user_email
            }
        
        session = chat_sessions[session_id]
        
        # 2. Refresh Context
        if user_email:
            session['mongo_context'] = get_mongo_context(user_message, user_email)
            session['user_email'] = user_email
            
        # 3. Handle Admin Actions
        action_result = None
        if user_email:
            mongo_ctx = session.get('mongo_context', {})
            applications = mongo_ctx.get('club_applications', []) or mongo_ctx.get('all_applications', [])
            
            print(f"[DEBUG] Apps found for {user_email}: {len(applications)}")
            
            if applications:
                update_cmd = parse_update_command(user_message, applications)
                
                if update_cmd:
                    app_to_update = update_cmd['application']
                    app_id = app_to_update.get('_id') or app_to_update.get('id')
                    new_status = update_cmd['new_status']
                    
                    if app_id:
                        result = update_application(str(app_id), {'status': new_status}, user_email)
                        
                        applicant_name = app_to_update.get('applicantName', 'the applicant')
                        if result['success']:
                            action_result = f"SYSTEM SUCCESS: Updated application for {applicant_name} to '{new_status}'."
                            # Refresh context so LLM sees new state
                            session['mongo_context'] = get_mongo_context(user_message, user_email)
                        else:
                            action_result = f"SYSTEM ERROR: Failed to update {applicant_name}. Reason: {result['error']}"
        
        # 4. Construct Prompt
        # Format history string manually
        history_str = ""
        for msg in session['history']:
            role = "User" if msg['role'] == 'user' else "Assistant"
            history_str += f"{role}: {msg['content']}\n\n"
            
        # Add current message with invisible system note if action performed
        current_input = f"User: {user_message}"
        if action_result:
            current_input = f"[System Notification: {action_result}]\n" + current_input
            
        # (Assuming build_system_prompt implementation exists as per previous)
        # Using a simple prompt here for the fix demo
        sys_prompt = "You are a club admin assistant. Help manage applications."
        full_prompt = f"{sys_prompt}\n\nHistory:\n{history_str}\n{current_input}\nAssistant:"
        
        response = call_cortex_llm(full_prompt)
        
        # 5. Update History
        session['history'].append({'role': 'user', 'content': user_message})
        session['history'].append({'role': 'assistant', 'content': response})
        if len(session['history']) > 20: session['history'] = session['history'][-20:]
        
        return jsonify({
            'response': response,
            'session_id': session_id,
            'action_performed': action_result is not None
        })
        
    except Exception as e:
        print(f"Chat Error: {e}")
        return jsonify({'error': str(e)}), 500
@app.route('/chat/reset', methods=['POST'])
def reset_chat():
    """Reset a chat session."""
    data = request.json
    session_id = data.get('session_id', 'default')
    
    if session_id in chat_sessions:
        del chat_sessions[session_id]
    
    return jsonify({'message': f'Session {session_id} reset successfully'})


# Direct API endpoint to update applications (admin only)
@app.route('/applications/<application_id>', methods=['PATCH'])
def patch_application(application_id):
    """Update an application's status or other fields."""
    data = request.json
    user_email = data.get('user_email')
    
    if not user_email:
        return jsonify({'error': 'user_email is required'}), 400
    
    # Extract updates (exclude user_email from updates)
    updates = {k: v for k, v in data.items() if k != 'user_email'}
    
    if not updates:
        return jsonify({'error': 'No updates provided'}), 400
    
    result = update_application(application_id, updates, user_email)
    
    if result['success']:
        return jsonify(result)
    else:
        return jsonify(result), 400


def serialize_mongo_doc(doc):
    """Recursively convert ObjectId to string in a MongoDB document."""
    if isinstance(doc, dict):
        return {k: serialize_mongo_doc(v) for k, v in doc.items()}
    elif isinstance(doc, list):
        return [serialize_mongo_doc(item) for item in doc]
    elif isinstance(doc, ObjectId):
        return str(doc)
    else:
        return doc


@app.route('/applications', methods=['GET'])
def get_applications():
    """Get applications (admin only)."""
    user_email = request.args.get('user_email')
    
    if not user_email:
        return jsonify({'error': 'user_email is required'}), 400
    
    try:
        db = get_mongo_db()
        
        # Verify user is admin
        user = db.users.find_one({'email': user_email}, {'passwordHash': 0})
        if not user or ('ADMIN' not in user.get('roles', []) and 'CLUB_LEADER' not in user.get('roles', [])):
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get applications with populated applicant info
        applications_raw = list(db.applications.find({}).limit(100))
        applications = [populate_application(db, app) for app in applications_raw]
        
        return jsonify({'applications': applications})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ── Application endpoints for admin frontend ─────────────────────

# Demo club ID to name mapping (matches DevSessionContext.tsx)
DEMO_CLUB_IDS = {
    'c1': 'McGill AI Society',
    'c2': 'HackMcGill',
    'c3': 'Computer Science Undergraduate Society',
    'c4': 'McGill Robotics',
    'c5': 'McGill Women in CS',
    'c6': 'McGill Blockchain Club',
}

@app.route('/clubs/<club_id>/applications', methods=['GET'])
def get_club_applications(club_id):
    """Get applications for a specific club (for admin frontend)."""
    try:
        db = get_mongo_db()
        
        # Filters
        status = request.args.get('status')
        position_id = request.args.get('positionId')
        
        # Handle demo club IDs
        club_name = DEMO_CLUB_IDS.get(club_id)
        
        # Try to find the actual club first
        actual_club = None
        if club_name:
            # Demo club ID - look up by name
            actual_club = db.clubs.find_one({'name': {'$regex': club_name, '$options': 'i'}})
        
        if not actual_club:
            # Try as ObjectId or slug
            try:
                actual_club = db.clubs.find_one({'_id': ObjectId(club_id)})
            except:
                actual_club = db.clubs.find_one({'$or': [{'slug': club_id}, {'name': club_id}]})
        
        if not actual_club:
            # No club found
            return jsonify([])
        
        actual_club_id = str(actual_club.get('_id'))
        actual_club_name = actual_club.get('name', '')
        
        # Find all openRoles for this club
        # The openroles collection has a 'club' field that references the club ObjectId
        open_roles = list(db.openroles.find({
            '$or': [
                {'club': actual_club.get('_id')},  # ObjectId reference
                {'club': actual_club_id},  # String ID
                {'clubId': actual_club_id},
            ]
        }))
        
        # Get role IDs as both ObjectId and string
        role_ids = []
        role_id_strs = []
        for role in open_roles:
            role_ids.append(role.get('_id'))
            role_id_strs.append(str(role.get('_id')))
        
        # Find applications that reference these openRoles
        if role_ids:
            app_query = {'$or': [
                {'openRole': {'$in': role_ids}},
                {'openRole': {'$in': role_id_strs}},
                {'roleId': {'$in': role_id_strs}},
                {'positionId': {'$in': role_id_strs}},
            ]}
        else:
            # No roles found, try direct club match as fallback
            app_query = {'$or': [
                {'clubId': actual_club_id},
                {'club': actual_club_name},
                {'club': {'$regex': actual_club_name, '$options': 'i'}}
            ]}
        
        if status:
            app_query = {'$and': [app_query, {'status': {'$regex': status, '$options': 'i'}}]}
        if position_id:
            app_query = {'$and': [app_query, {'$or': [
                {'openRole': ObjectId(position_id) if ObjectId.is_valid(position_id) else position_id},
                {'openRole': position_id},
                {'roleId': position_id},
                {'positionId': position_id},
            ]}]}
        
        applications_raw = list(db.applications.find(app_query).limit(200))
        
        # Build a map of role IDs to role info
        role_map = {str(r.get('_id')): r for r in open_roles}
        
        # Transform to frontend shape
        applications = []
        for app in applications_raw:
            # Get the role info
            app_role_id = str(app.get('openRole', ''))
            role_info = role_map.get(app_role_id, {})
            
            populated = populate_application(db, app)
            
            # Convert answers if stored as dict
            answers = app.get('answers', [])
            if isinstance(answers, dict):
                answers = [{'questionId': k, 'question': k, 'answer': v} for k, v in answers.items()]
            
            applications.append({
                'id': str(app.get('_id')),
                'userId': str(app.get('applicant', '')) or app.get('userId', ''),
                'clubId': actual_club_id,
                'positionId': app_role_id or app.get('positionId', ''),
                'status': (app.get('status', 'submitted') or 'submitted').lower().replace('_', '_'),
                'answers': answers,
                'submittedAt': str(app.get('submittedAt') or app.get('createdAt', '')),
                'updatedAt': str(app.get('updatedAt') or app.get('submittedAt', '')),
                'applicantName': populated.get('applicantName', 'Unknown'),
                'applicantEmail': populated.get('applicantEmail', ''),
                'clubName': actual_club_name,
                'positionTitle': role_info.get('jobTitle') or role_info.get('title') or populated.get('positionTitle', ''),
            })
        
        return jsonify(applications)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/applications/<application_id>', methods=['GET'])
def get_application_detail(application_id):
    """Get a single application by ID."""
    try:
        db = get_mongo_db()
        
        try:
            app_filter = {'_id': ObjectId(application_id)}
        except:
            app_filter = {'$or': [{'applicationId': application_id}, {'id': application_id}]}
        
        app = db.applications.find_one(app_filter)
        if not app:
            return jsonify({'error': 'Application not found'}), 404
        
        populated = populate_application(db, app)
        result = {
            'id': str(app.get('_id')),
            'userId': app.get('applicant') or app.get('userId', ''),
            'clubId': app.get('clubId', ''),
            'positionId': app.get('roleId') or app.get('positionId', ''),
            'status': app.get('status', 'submitted'),
            'answers': app.get('answers', []),
            'submittedAt': app.get('submittedAt') or app.get('createdAt', ''),
            'updatedAt': app.get('updatedAt') or app.get('submittedAt', ''),
            'applicantName': populated.get('applicantName', 'Unknown'),
            'applicantEmail': populated.get('applicantEmail', ''),
            'clubName': populated.get('clubName') or app.get('club', ''),
            'positionTitle': populated.get('positionTitle') or app.get('role', ''),
        }
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/applications/<application_id>/status', methods=['PATCH'])
def patch_application_status(application_id):
    """Update just the status of an application."""
    data = request.json
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({'error': 'status is required'}), 400
    
    try:
        db = get_mongo_db()
        
        try:
            app_filter = {'_id': ObjectId(application_id)}
        except:
            app_filter = {'$or': [{'applicationId': application_id}, {'id': application_id}]}
        
        app = db.applications.find_one(app_filter)
        if not app:
            return jsonify({'error': 'Application not found'}), 404
        
        # Update status
        result = db.applications.update_one(app_filter, {
            '$set': {
                'status': new_status,
                'updatedAt': __import__('datetime').datetime.utcnow().isoformat()
            }
        })
        
        # Return updated application
        app = db.applications.find_one(app_filter)
        populated = populate_application(db, app)
        
        return jsonify({
            'id': str(app.get('_id')),
            'userId': app.get('applicant') or app.get('userId', ''),
            'clubId': app.get('clubId', ''),
            'positionId': app.get('roleId') or app.get('positionId', ''),
            'status': app.get('status', 'submitted'),
            'answers': app.get('answers', []),
            'submittedAt': app.get('submittedAt') or app.get('createdAt', ''),
            'updatedAt': app.get('updatedAt', ''),
            'applicantName': populated.get('applicantName', 'Unknown'),
            'applicantEmail': populated.get('applicantEmail', ''),
            'clubName': populated.get('clubName') or app.get('club', ''),
            'positionTitle': populated.get('positionTitle') or app.get('role', ''),
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/clubs/<club_id>/recruitment-posts', methods=['GET'])
def get_club_recruitment_posts(club_id):
    """Get recruitment posts for a club (includes positions)."""
    try:
        db = get_mongo_db()
        
        # Handle demo club IDs
        club_name_hint = DEMO_CLUB_IDS.get(club_id)
        
        # Find club
        club = None
        if club_name_hint:
            # Demo club ID - look up by name
            club = db.clubs.find_one({'name': {'$regex': club_name_hint, '$options': 'i'}})
        
        if not club:
            try:
                club = db.clubs.find_one({'_id': ObjectId(club_id)})
            except:
                club = db.clubs.find_one({'$or': [{'slug': club_id}, {'name': {'$regex': club_id, '$options': 'i'}}]})
        
        if not club:
            return jsonify([])
        
        club_id_str = str(club.get('_id'))
        club_name = club.get('name', '')
        
        # Get open roles as positions
        roles = list(db.openroles.find({
            '$or': [
                {'clubId': club_id_str},
                {'club': club_name}
            ]
        }))
        
        positions = []
        for role in roles:
            positions.append({
                'id': str(role.get('_id')),
                'clubId': club_id_str,
                'title': role.get('title') or role.get('name', ''),
                'description': role.get('description', ''),
                'requirements': role.get('requirements', []),
                'deadline': role.get('deadline', ''),
                'isOpen': role.get('isOpen', True),
                'applicantCount': role.get('applicantCount', 0),
                'createdAt': role.get('createdAt', ''),
            })
        
        # Return as a single recruitment post containing all positions
        if positions:
            return jsonify([{
                'id': f'rp-{club_id_str}',
                'clubId': club_id_str,
                'title': f'{club_name} Recruitment',
                'description': f'Open positions at {club_name}',
                'positions': positions,
                'publishedAt': positions[0].get('createdAt', ''),
                'closesAt': '',
                'isActive': True,
            }])
        
        return jsonify([])
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/applications/bulk-status', methods=['PATCH'])
def bulk_update_status():
    """Update status for multiple applications at once."""
    data = request.json
    application_ids = data.get('applicationIds', [])
    new_status = data.get('status')
    
    if not application_ids or not new_status:
        return jsonify({'error': 'applicationIds and status are required'}), 400
    
    try:
        db = get_mongo_db()
        updated = []
        
        for app_id in application_ids:
            try:
                app_filter = {'_id': ObjectId(app_id)}
            except:
                continue
            
            db.applications.update_one(app_filter, {
                '$set': {
                    'status': new_status,
                    'updatedAt': __import__('datetime').datetime.utcnow().isoformat()
                }
            })
            
            app = db.applications.find_one(app_filter)
            if app:
                populated = populate_application(db, app)
                updated.append({
                    'id': str(app.get('_id')),
                    'userId': app.get('applicant') or app.get('userId', ''),
                    'clubId': app.get('clubId', ''),
                    'positionId': app.get('roleId') or app.get('positionId', ''),
                    'status': app.get('status', 'submitted'),
                    'answers': app.get('answers', []),
                    'submittedAt': app.get('submittedAt') or app.get('createdAt', ''),
                    'updatedAt': app.get('updatedAt', ''),
                    'applicantName': populated.get('applicantName', 'Unknown'),
                    'applicantEmail': populated.get('applicantEmail', ''),
                    'clubName': populated.get('clubName') or app.get('club', ''),
                    'positionTitle': populated.get('positionTitle') or app.get('role', ''),
                })
        
        return jsonify(updated)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=False, port=5001)
