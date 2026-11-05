-- Letters: Arial, with 1.38-inch margins on all four sides (firm practice).
update public.firm_settings
set letter_format = letter_format || '{"font": "Arial", "marginInches": 1.38}'::jsonb;

update public.firm_settings
set court_format = court_format || '{"marginInches": 1}'::jsonb
where not (court_format ? 'marginInches');

alter table public.firm_settings
  alter column letter_format set default jsonb_build_object(
    'pageSize', 'A4', 'font', 'Arial', 'fontSizePt', 12,
    'lineSpacing', 1.5, 'justified', true, 'subNumbering', 'dot', 'marginInches', 1.38),
  alter column court_format set default jsonb_build_object(
    'pageSize', 'A4', 'font', 'Times New Roman', 'fontSizePt', 12,
    'lineSpacing', 1.5, 'justified', true, 'subNumbering', 'paren', 'marginInches', 1);
