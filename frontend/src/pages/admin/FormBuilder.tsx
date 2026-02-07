import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Plus, Trash2, GripVertical, ChevronUp, ChevronDown,
  Type, AlignLeft, Link2, ListChecks, ToggleRight, ToggleLeft, Save, Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedPage } from '../../components/motion/AnimatedPage';
import { PageContainer } from '../../components/layout/PageContainer';
import { SectionHeader } from '../../components/layout/SectionHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { EmptyStateCard } from '../../components/ui/EmptyStateCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useApi } from '../../contexts/ApiContext';
import { useToast } from '../../contexts/ToastContext';
import type { Question } from '../../contracts';

type QuestionType = Question['type'];

const typeInfo: Record<QuestionType, { label: string; icon: React.ReactNode }> = {
  short_text: { label: 'Short Text', icon: <Type size={14} /> },
  long_text: { label: 'Long Text', icon: <AlignLeft size={14} /> },
  url: { label: 'URL', icon: <Link2 size={14} /> },
  select: { label: 'Multiple Choice', icon: <ListChecks size={14} /> },
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function newQuestion(type: QuestionType): Question {
  return {
    id: uid(),
    label: '',
    type,
    required: false,
    placeholder: '',
    options: type === 'select' ? ['Option 1'] : undefined,
  };
}

// ── Question Editor Card ──────────────────────────────
function QuestionCard({
  question,
  index,
  total,
  onChange,
  onDelete,
  onMove,
}: {
  question: Question;
  index: number;
  total: number;
  onChange: (q: Question) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const info = typeInfo[question.type];

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
            {/* Reorder controls */}
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

            <div className="flex-1 space-y-3">
              {/* Header row */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="info" className="gap-1">
                  {info.icon}
                  {info.label}
                </Badge>
                <span className="text-xs text-warmGray-400">Q{index + 1}</span>
                <div className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <button
                      type="button"
                      onClick={() => onChange({ ...question, required: !question.required })}
                      className="text-warmGray-400 hover:text-brand-500 transition-colors cursor-pointer"
                    >
                      {question.required
                        ? <ToggleRight size={22} className="text-calm-500" />
                        : <ToggleLeft size={22} />
                      }
                    </button>
                    <span className="text-xs text-warmGray-500">Required</span>
                  </label>
                  <button
                    onClick={onDelete}
                    className="rounded-lg p-1.5 text-warmGray-400 hover:text-cozy-500 hover:bg-cozy-50 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Question label */}
              <Input
                placeholder="Question label (e.g. Why do you want to join?)"
                value={question.label}
                onChange={(e) => onChange({ ...question, label: e.target.value })}
              />

              {/* Placeholder */}
              <Input
                placeholder="Placeholder text (optional)"
                value={question.placeholder ?? ''}
                onChange={(e) => onChange({ ...question, placeholder: e.target.value })}
                className="text-xs"
              />

              {/* MC Options */}
              {question.type === 'select' && (
                <div className="space-y-2 rounded-xl bg-warmGray-50 p-3">
                  <p className="text-xs font-medium text-warmGray-500">Options</p>
                  {(question.options ?? []).map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-warmGray-300">
                        <div className="h-1.5 w-1.5 rounded-full bg-warmGray-300" />
                      </div>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const opts = [...(question.options ?? [])];
                          opts[oi] = e.target.value;
                          onChange({ ...question, options: opts });
                        }}
                        className="flex-1 rounded-lg border border-warmGray-200 bg-white px-3 py-1.5 text-sm text-warmGray-700 focus:border-calm-400 focus:outline-none focus:ring-2 focus:ring-calm-400/30"
                        placeholder={`Option ${oi + 1}`}
                      />
                      <button
                        onClick={() => {
                          const opts = (question.options ?? []).filter((_, i) => i !== oi);
                          onChange({ ...question, options: opts.length > 0 ? opts : ['Option 1'] });
                        }}
                        className="rounded p-1 text-warmGray-400 hover:text-cozy-500 cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => onChange({ ...question, options: [...(question.options ?? []), ''] })}
                    className="inline-flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 transition-colors cursor-pointer"
                  >
                    <Plus size={12} />
                    Add option
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Preview Panel ─────────────────────────────────────
function PreviewPanel({ questions }: { questions: Question[] }) {
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
        {questions.map((q) => (
          <div key={q.id}>
            <label className="mb-1.5 block text-sm font-medium text-warmGray-700">
              {q.label || 'Untitled question'}
              {q.required && <span className="text-cozy-400 ml-0.5">*</span>}
            </label>
            {q.type === 'short_text' && (
              <input disabled className="w-full rounded-xl border border-warmGray-200 bg-warmGray-50 px-4 py-2.5 text-sm text-warmGray-400" placeholder={q.placeholder ?? ''} />
            )}
            {q.type === 'long_text' && (
              <textarea disabled className="w-full rounded-xl border border-warmGray-200 bg-warmGray-50 px-4 py-3 text-sm text-warmGray-400 min-h-[80px] resize-none" placeholder={q.placeholder ?? ''} />
            )}
            {q.type === 'url' && (
              <input disabled className="w-full rounded-xl border border-warmGray-200 bg-warmGray-50 px-4 py-2.5 text-sm text-warmGray-400" placeholder={q.placeholder ?? 'https://...'} />
            )}
            {q.type === 'select' && (
              <div className="space-y-1.5">
                {(q.options ?? []).map((opt, i) => (
                  <label key={i} className="flex items-center gap-2.5 rounded-lg bg-warmGray-50 px-3 py-2">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-warmGray-300" />
                    <span className="text-sm text-warmGray-500">{opt || `Option ${i + 1}`}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────
export function FormBuilder() {
  const { positionId } = useParams<{ positionId: string }>();
  const api = useApi();
  const { showToast } = useToast();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!positionId) return;
    api.getFormSchema(positionId).then((schema) => {
      if (schema) setQuestions(schema.questions);
      setLoading(false);
    });
  }, [api, positionId]);

  const addQuestion = (type: QuestionType) => {
    setQuestions((prev) => [...prev, newQuestion(type)]);
  };

  const updateQuestion = (index: number, q: Question) => {
    setQuestions((prev) => prev.map((old, i) => (i === index ? q : old)));
  };

  const deleteQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

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
    if (!positionId) return;
    setSaving(true);
    await api.upsertFormSchema(positionId, { questions });
    setSaving(false);
    showToast('Form saved successfully');
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
          title="Application Form Builder"
          subtitle="Design the questions applicants will answer"
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
                {saving ? 'Saving...' : 'Save Form'}
              </Button>
            </div>
          }
          className="mb-6"
        />

        <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
          {/* Editor */}
          <div className="space-y-4">
            {/* Add question toolbar */}
            <Card>
              <CardContent className="py-3">
                <p className="text-xs font-medium text-warmGray-500 mb-2">Add a question</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(typeInfo) as [QuestionType, { label: string; icon: React.ReactNode }][]).map(
                    ([type, info]) => (
                      <button
                        key={type}
                        onClick={() => addQuestion(type)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-warmGray-200 bg-white px-3 py-2 text-xs font-medium text-warmGray-600 transition-all hover:border-brand-300 hover:text-brand-600 hover:shadow-sm cursor-pointer"
                      >
                        {info.icon}
                        {info.label}
                      </button>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Questions list */}
            {questions.length === 0 ? (
              <EmptyStateCard
                emoji="📝"
                title="No questions yet"
                description="Use the toolbar above to add questions to your application form."
              />
            ) : (
              <AnimatePresence initial={false}>
                {questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    index={i}
                    total={questions.length}
                    onChange={(updated) => updateQuestion(i, updated)}
                    onDelete={() => deleteQuestion(i)}
                    onMove={(dir) => moveQuestion(i, dir)}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Preview */}
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
