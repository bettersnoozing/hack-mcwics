import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, GripVertical, Save, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { openRoleApi, type OpenRoleData } from '../../services/openRoleApi';

function QuestionCard({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMove,
}: {
  question: string;
  index: number;
  total: number;
  onChange: (value: string) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="border-l-4 border-l-brand-300">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center gap-0.5 pt-1">
              <GripVertical size={14} className="text-warmGray-300" />
              <button
                onClick={() => onMove(-1)}
                disabled={index === 0}
                className="rounded p-0.5 text-warmGray-400 hover:text-warmGray-600 disabled:opacity-30 cursor-pointer"
              >
                <ChevronUp size={14} />
              </button>
              <button
                onClick={() => onMove(1)}
                disabled={index === total - 1}
                className="rounded p-0.5 text-warmGray-400 hover:text-warmGray-600 disabled:opacity-30 cursor-pointer"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-warmGray-400">Q{index + 1}</span>
                <div className="ml-auto">
                  <button
                    onClick={onDelete}
                    className="rounded-lg p-1.5 text-warmGray-400 hover:text-cozy-500 hover:bg-cozy-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <Input
                placeholder="Enter your question (e.g. Why do you want to join?)"
                value={question}
                onChange={(e) => onChange(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PreviewPanel({ questions }: { questions: string[] }) {
  if (questions.length === 0) {
    return (
      <EmptyStateCard
        emoji="👀"
        title="Nothing to preview"
        description="Add questions to see a live preview."
      />
    );
  }
  return (
    <Card>
      <CardContent className="space-y-4 py-5">
        <p className="text-xs font-medium text-warmGray-400 uppercase tracking-wide">Student Preview</p>
        {questions.map((q, i) => (
          <div key={i}>
            <label className="mb-1.5 block text-sm font-medium text-warmGray-700">
              {q || 'Untitled question'}
              <span className="text-cozy-400 ml-0.5">*</span>
            </label>
            <textarea
              disabled
              className="w-full rounded-xl border border-warmGray-200 bg-warmGray-50 px-4 py-3 text-sm text-warmGray-400 min-h-[60px] resize-none"
              placeholder="Student's answer..."
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function FormBuilder() {
  const { openRoleId } = useParams<{ openRoleId: string }>();

  const [role, setRole] = useState<OpenRoleData | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!openRoleId) return;
    openRoleApi.getById(openRoleId)
      .then((data) => {
        setRole(data);
        setQuestions(data.applicationQuestions ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [openRoleId]);

  const addQuestion = () => setQuestions((prev) => [...prev, '']);

  const updateQuestion = (index: number, value: string) =>
    setQuestions((prev) => prev.map((q, i) => (i === index ? value : q)));

  const deleteQuestion = (index: number) =>
    setQuestions((prev) => prev.filter((_, i) => i !== index));

  const moveQuestion = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    setQuestions((prev) => {
      const copy = [...prev];
      [copy[index], copy[target]] = [copy[target]!, copy[index]!];
      return copy;
    });
  };

  const handleSave = async () => {
    if (!openRoleId) return;
    setSaving(true);
    try {
      const updated = await openRoleApi.update(openRoleId, { applicationQuestions: questions });
      setRole(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <SkeletonCard />
        <SkeletonCard className="mt-4" />
      </PageContainer>
    );
  }

  return (
    <AnimatedPage>
      <PageContainer>
        <Link
          to="/admin/recruitment"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-warmGray-500 hover:text-warmGray-700 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Recruitment
        </Link>

        <SectionHeader
          title={role ? `Questions — ${role.jobTitle}` : 'Application Questions'}
          subtitle="Define the questions applicants will answer"
          action={
            <div className="flex gap-2">
              <Button
                variant="outline"
                icon={<Eye size={14} />}
                onClick={() => setShowPreview((p) => !p)}
              >
                {showPreview ? 'Hide Preview' : 'Preview'}
              </Button>
              <Button
                variant="cozyGradient"
                icon={<Save size={14} />}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Questions'}
              </Button>
            </div>
          }
          className="mb-6"
        />

        <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
          <div className="space-y-4">
            <Card>
              <CardContent className="py-3">
                <p className="text-xs font-medium text-warmGray-500 mb-2">Add a question</p>
                <button
                  onClick={addQuestion}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-warmGray-200 bg-white px-3 py-2 text-xs font-medium text-warmGray-600 transition-all hover:border-brand-300 hover:text-brand-600 hover:shadow-sm cursor-pointer"
                >
                  <Plus size={14} />
                  Add Question
                </button>
              </CardContent>
            </Card>

            {questions.length === 0 ? (
              <EmptyStateCard
                emoji="📝"
                title="No questions yet"
                description="Add questions that applicants will answer when applying for this role."
              />
            ) : (
              <AnimatePresence initial={false}>
                {questions.map((q, i) => (
                  <QuestionCard
                    key={i}
                    question={q}
                    index={i}
                    total={questions.length}
                    onChange={(v) => updateQuestion(i, v)}
                    onDelete={() => deleteQuestion(i)}
                    onMove={(dir) => moveQuestion(i, dir)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {showPreview && (
            <div className="lg:sticky lg:top-24 lg:self-start">
              <PreviewPanel questions={questions} />
            </div>
          )}
        </div>
      </PageContainer>
    </AnimatedPage>
  );
}
