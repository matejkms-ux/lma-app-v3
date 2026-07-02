-- Bonus lessons (…-bonusNNN) are off the main path by design: free-form titles,
-- no position in the numbered sequence (see memory: "Bonus · jederzeit offen").
-- Exempt them from the four numbering checks; keep every content-quality check
-- (sentences, gaps, empty text, translit, orphans, audio).
-- Applied to live 2026-07-01 (migration: content_audit_bonus_lesson_exemptions).
create or replace view public.content_audit as
with lessons_x as (
  select l.id, l.lesson_code, l.language, l.title, l.lesson_number, l.version, l.is_active,
    split_part(l.lesson_code,'-',1) as learner,
    (l.lesson_code ~ '-bonus[0-9]+$') as is_bonus,
    (regexp_match(l.title,'^\s*([0-9]+)\.([0-9]+)'))[1]::int as title_num,
    (regexp_match(l.title,'^\s*([0-9]+)\.([0-9]+)'))[2]::int as title_ver,
    (regexp_match(l.lesson_code,'-([0-9]+)$'))[1]::int as code_suffix
  from lessons l
)
select 'FAIL'::text as severity, 'TITLE_PREFIX_MISMATCH'::text as check_name,
  lesson_code||' v'||version as ref,
  'title="'||title||'" but row is '||coalesce(lesson_number::text,'NULL')||'.'||version as detail
from lessons_x
where is_active and not is_bonus
  and (title_num is distinct from lesson_number or title_ver is distinct from version)
union all
select 'FAIL','CODE_SUFFIX_MISMATCH', lesson_code||' v'||version,
  'code ends -'||coalesce(code_suffix::text,'?')||' but lesson_number='||coalesce(lesson_number::text,'NULL')
from lessons_x
where is_active and not is_bonus and code_suffix is distinct from lesson_number
union all
select 'FAIL','LESSON_NUMBER_NULL', lesson_code||' v'||version, title
from lessons_x
where is_active and not is_bonus and lesson_number is null
union all
select 'FAIL','LESSON_NO_SENTENCES', l.lesson_code||' v'||l.version, l.title
from lessons_x l
left join sentences s on s.lesson_code = l.lesson_code and s.version = l.version
where l.is_active and s.id is null
union all
select 'FAIL','SENTENCE_NR_GAP', s.lesson_code||' v'||s.version,
  'count='||count(*)||' min='||min(s.sentence_nr)||' max='||max(s.sentence_nr)
from sentences s
join lessons_x l on l.lesson_code = s.lesson_code and l.version = s.version and l.is_active
group by s.lesson_code, s.version
having count(*) <> (max(s.sentence_nr) - min(s.sentence_nr) + 1) or min(s.sentence_nr) <> 1
union all
select 'FAIL','EMPTY_L1_OR_L2', s.lesson_code||' #'||s.sentence_nr,
  case when coalesce(trim(s.l1),'') = '' then 'L1 empty ' else '' end ||
  case when coalesce(trim(s.l2),'') = '' then 'L2 empty' else '' end
from sentences s
join lessons_x l on l.lesson_code = s.lesson_code and l.version = s.version and l.is_active
where coalesce(trim(s.l1),'') = '' or coalesce(trim(s.l2),'') = ''
union all
select 'FAIL','JA_MISSING_TRANSLIT', s.lesson_code||' #'||s.sentence_nr,
  case when coalesce(trim(s.l2_translit_1),'') = '' then 'no furigana(translit_1) ' else '' end ||
  case when coalesce(trim(s.l2_translit_2),'') = '' then 'no romaji(translit_2)' else '' end
from sentences s
join lessons_x l on l.lesson_code = s.lesson_code and l.version = s.version and l.is_active
where l.language = 'JAPANESE'
  and (coalesce(trim(s.l2_translit_1),'') = '' or coalesce(trim(s.l2_translit_2),'') = '')
union all
select 'FAIL','DUP_CODE_VERSION', lesson_code||' v'||version, 'appears '||count(*)||' times'
from lessons
group by lesson_code, version
having count(*) > 1
union all
select 'FAIL','DUP_LESSON_NUMBER',
  learner||' '||language||' v'||version||' #'||lesson_number,
  'lesson_number used by '||count(*)||' active lessons'
from lessons_x
where is_active and not is_bonus and lesson_number is not null
group by learner, language, version, lesson_number
having count(*) > 1
union all
select 'FAIL','ORPHAN_SENTENCE', s.lesson_code||' v'||s.version, s.l2
from sentences s
left join lessons l on l.lesson_code = s.lesson_code and l.version = s.version
where l.id is null
union all
select 'FAIL','ORPHAN_AUDIO', a.lesson_code||' v'||a.version, a.step||' -> '||a.audio_url
from lesson_audio a
left join lessons l on l.lesson_code = a.lesson_code and l.version = a.version
where l.id is null
union all
select 'WARN','NO_AUDIO_YET', l.lesson_code||' v'||l.version, l.title
from lessons_x l
where l.is_active
  and not exists (select 1 from lesson_audio a where a.lesson_code = l.lesson_code and a.version = l.version)
  and not exists (select 1 from sentences s where s.lesson_code = l.lesson_code and s.version = l.version
                  and coalesce(trim(s.l2_audio_url),'') <> '');

alter view public.content_audit set (security_invoker = true);
