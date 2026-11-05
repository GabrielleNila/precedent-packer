-- Phase 2: letters.
-- Job titles appear in the letterhead block ("Paralegal", "Senior Secretary").
alter table public.members add column if not exists job_title text;

-- Per-firm letterhead details (tel, fax, address line, footer text, logo).
-- Empty means "use the defaults built into the app" (taken from the firm's
-- own letters); the Settings page in Phase 5 edits this.
alter table public.firm_settings
  add column if not exists letterhead jsonb not null default '{}'::jsonb;

-- Letters number sub-paragraphs "a." / "i." like the firm's letters;
-- pleadings use "(a)" / "(i)".
update public.firm_settings
set letter_format = letter_format || '{"subNumbering": "dot"}'::jsonb
where not (letter_format ? 'subNumbering');
update public.firm_settings
set court_format = court_format || '{"subNumbering": "paren"}'::jsonb
where not (court_format ? 'subNumbering');

alter table public.firm_settings
  alter column letter_format set default jsonb_build_object(
    'pageSize', 'A4', 'font', 'Times New Roman', 'fontSizePt', 12,
    'lineSpacing', 1.5, 'justified', true, 'subNumbering', 'dot'),
  alter column court_format set default jsonb_build_object(
    'pageSize', 'A4', 'font', 'Times New Roman', 'fontSizePt', 12,
    'lineSpacing', 1.5, 'justified', true, 'subNumbering', 'paren');
