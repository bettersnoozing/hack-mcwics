import os
import json
from flask import Flask, jsonify, request
from flask_cors import CORS
import snowflake.connector
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# MongoDB connection
MONGO_URI = os.getenv('DEV_MONGO')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'mcwics-portal')
mongo_client = None
mongo_db = None


def get_mongo_db():
    """Get MongoDB database connection."""
    global mongo_client, mongo_db
    if mongo_db is None:
        mongo_client = MongoClient(MONGO_URI)
        mongo_db = mongo_client[MONGO_DB_NAME]
    return mongo_db


def get_mongo_context(query=None):
    """Query MongoDB for relevant context based on user query."""
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
        
        # Get applications (without sensitive details)
        applications = list(db.applications.find({}, {'_id': 0}).limit(50))
        context['applications'] = applications
        
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
    try:
        rows = query_snowflake("SELECT * FROM clubs WHERE slug = %s", (slug,))
        if not rows:
            return jsonify({'error': 'Club not found'}), 404
        return jsonify(rows[0])
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
    try:
        rows = query_snowflake("SELECT * FROM positions WHERE id = %s", (position_id,))
        if not rows:
            return jsonify({'error': 'Position not found'}), 404
        return jsonify(rows[0])
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
    if mongo_context:
        if 'users' in mongo_context and mongo_context['users']:
            users_str = json.dumps(mongo_context['users'], indent=2, default=str)
            mongo_section += f"\n\nRegistered users on the platform (from MongoDB):\n{users_str}"
        if 'mongo_clubs' in mongo_context and mongo_context['mongo_clubs']:
            mongo_clubs_str = json.dumps(mongo_context['mongo_clubs'], indent=2, default=str)
            mongo_section += f"\n\nClubs data (from MongoDB):\n{mongo_clubs_str}"
        if 'openroles' in mongo_context and mongo_context['openroles']:
            openroles_str = json.dumps(mongo_context['openroles'], indent=2, default=str)
            mongo_section += f"\n\nOpen roles/positions (from MongoDB):\n{openroles_str}"
        if 'applications' in mongo_context and mongo_context['applications']:
            apps_str = json.dumps(mongo_context['applications'], indent=2, default=str)
            mongo_section += f"\n\nApplications submitted (from MongoDB):\n{apps_str}"
    
    return f"""You are a helpful assistant for McGill University's club recruitment platform.
You help students find clubs and positions that match their interests.

Here is the current data about clubs (from Snowflake):
{clubs_str}

Here are the current open positions (from Snowflake):
{positions_str}{mongo_section}

Guidelines:
- Be friendly and helpful
- Format responses in a clear, readable way
- When recommending clubs, explain why they might be a good fit
- Always mention relevant deadlines for positions
- If a user asks about applying, guide them but note you cannot submit applications for them
- Keep responses concise but informative
- You have access to data from both Snowflake and MongoDB - use it to provide accurate, personalized responses"""


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
    """Chat endpoint using Snowflake Cortex with Mistral."""
    data = request.json
    user_message = data.get('message', '')
    session_id = data.get('session_id', 'default')
    
    if not user_message:
        return jsonify({'error': 'Message is required'}), 400
    
    try:
        # Get or create session history
        if session_id not in chat_sessions:
            chat_sessions[session_id] = {
                'history': [],
                'context': get_club_context(),
                'mongo_context': get_mongo_context(user_message)
            }
        
        session = chat_sessions[session_id]
        
        # Build prompt with context from both Snowflake and MongoDB
        system_prompt = build_system_prompt(session['context'], session.get('mongo_context'))
        
        # Add system context to first message if new session
        if not session['history']:
            full_prompt = f"{system_prompt}\n\n{user_message}"
        else:
            full_prompt = user_message
        
        # Call Cortex LLM
        response = call_cortex_llm(full_prompt, session['history'])
        
        # Update history
        session['history'].append({'role': 'user', 'content': user_message})
        session['history'].append({'role': 'assistant', 'content': response})
        
        # Keep history manageable (last 10 exchanges)
        if len(session['history']) > 20:
            session['history'] = session['history'][-20:]
        
        return jsonify({
            'response': response,
            'session_id': session_id
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/chat/reset', methods=['POST'])
def reset_chat():
    """Reset a chat session."""
    data = request.json
    session_id = data.get('session_id', 'default')
    
    if session_id in chat_sessions:
        del chat_sessions[session_id]
    
    return jsonify({'message': f'Session {session_id} reset successfully'})


if __name__ == '__main__':
    app.run(debug=True, port=5001)
