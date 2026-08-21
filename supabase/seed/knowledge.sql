-- Clinical knowledge seed (11_Localization, 14_AI_NLP question bank + priority rules)

insert into public.languages (code, name, native_name, script, tier, asr_supported, tts_supported) values
  ('hi','Hindi','हिन्दी','Deva',1,true,true),
  ('mr','Marathi','मराठी','Deva',1,true,true),
  ('en','English','English','Latn',1,true,true),
  ('bn','Bengali','বাংলা','Beng',2,true,true),
  ('ta','Tamil','தமிழ்','Taml',2,true,true),
  ('te','Telugu','తెలుగు','Telu',2,true,true),
  ('gu','Gujarati','ગુજરાતી','Gujr',2,true,true),
  ('kn','Kannada','ಕನ್ನಡ','Knda',2,true,true),
  ('ml','Malayalam','മലയാളം','Mlym',2,true,true),
  ('pa','Punjabi','ਪੰਜਾਬੀ','Guru',2,true,true),
  ('or','Odia','ଓଡ଼ିଆ','Orya',2,true,true),
  ('ur','Urdu','اردو','Arab',2,true,true),
  ('as','Assamese','অসমীয়া','Beng',3,true,false),
  ('brx','Bodo','बर''','Deva',3,false,false),
  ('doi','Dogri','डोगरी','Deva',3,false,false),
  ('ks','Kashmiri','कॉशुर','Arab',3,false,false),
  ('kok','Konkani','कोंकणी','Deva',3,false,false),
  ('mai','Maithili','मैथिली','Deva',3,false,false),
  ('mni','Manipuri','ꯃꯩꯇꯩꯂꯣꯟ','Mtei',3,false,false),
  ('ne','Nepali','नेपाली','Deva',3,true,false),
  ('sa','Sanskrit','संस्कृतम्','Deva',3,false,false),
  ('sat','Santali','ᱥᱟᱱᱛᱟᱲᱤ','Olck',3,false,false),
  ('sd','Sindhi','سنڌي','Arab',3,false,false)
on conflict (code) do nothing;

insert into public.clinical_concepts (id, canonical_name, category) values
  ('SYM_FEVER','fever','symptom'),
  ('SYM_COUGH','cough','symptom'),
  ('SYM_HEADACHE','headache','symptom'),
  ('SYM_CHEST_PAIN','chest pain','symptom'),
  ('SYM_BREATHING','breathing difficulty','symptom'),
  ('SYM_VOMITING','vomiting','symptom'),
  ('SYM_BODY_PAIN','body pain','symptom')
on conflict (id) do nothing;

insert into public.concept_synonyms (concept_id, language, dialect, synonym_text) values
  ('SYM_FEVER','en',null,'fever'),
  ('SYM_FEVER','hi',null,'bukhar'),
  ('SYM_FEVER','hi',null,'बुखार'),
  ('SYM_FEVER','hi',null,'jvara'),
  ('SYM_FEVER','mr',null,'kaaychal'),
  ('SYM_FEVER','mr',null,'ताप'),
  ('SYM_CHEST_PAIN','hi',null,'सीने में दर्द'),
  ('SYM_BREATHING','en',null,'shortness of breath')
on conflict do nothing;

insert into public.question_bank (id, complaint_category, field, question_text_key, priority_order) values
  ('Q_DURATION','*','duration','ask_duration',10),
  ('Q_SEVERITY','*','severity','ask_severity',20),
  ('Q_MEDS','*','medications','ask_medications',30),
  ('Q_ALLERGY','*','allergies','ask_allergies',40),
  ('Q_CHEST_BREATH','chest_pain','breathing_difficulty','ask_breathing',5)
on conflict (id) do nothing;

insert into public.priority_rules (id, condition_expr, resulting_flag, version, is_active) values
  ('PR_CHEST_BREATH','chest_pain == true AND breathing_difficulty == true','HIGH',1,true),
  ('PR_FEVER_ELDERLY','fever_duration > 7 AND age > 60','MEDIUM',1,true),
  ('PR_SEVERE','severity == severe','MEDIUM',1,true)
on conflict (id) do nothing;
