# User Stories

## Patient
1. As a rural patient, I want to select my own language/dialect so I can describe my
   problem naturally without needing to know English or Hindi.
2. As a low-literacy patient, I want to speak instead of type so I don't struggle with a
   form.
3. As a patient, I want the AI to ask only relevant follow-up questions (not a fixed 30-
   question form) so the process feels quick.
4. As a patient, I want to see and confirm what the AI understood before it's sent to the
   doctor, so I can correct mistakes.
5. As a patient, I don't want the app to guess "no" when I didn't answer something (e.g.
   allergies) — I want it marked as not answered, so the doctor knows to ask me directly.

## Doctor
6. As a doctor, I want a queue of patients with a structured summary already prepared so I
   don't have to re-ask basic history.
7. As a doctor, I want missing information clearly flagged so I know exactly what to ask
   the patient myself.
8. As a doctor, I want contradictions in the patient's answers flagged (not silently
   resolved) so I can clarify with the patient.
9. As a doctor, I want to edit any AI-generated field and have my correction recorded, so
   the AI is never the final authority on the record.
10. As a doctor, I want a clear "Verify & Save" action so nothing is treated as clinically
    reliable until I've reviewed it — this must be explicit, not automatic.
11. As a doctor, I want a priority flag (e.g., chest pain + breathing difficulty) so I can
    triage urgent patients faster within the queue, while retaining final clinical
    judgment.

## ASHA / Health Worker
12. As a health worker, I want to help a patient get through the language/mic flow easily
    (large buttons, simple icons) so I can assist multiple patients quickly at a camp.

## Camp Organizer / Admin
13. As a camp organizer, I want to see how many patients have completed intake vs. are
    waiting, so I can manage flow and staffing.
14. As an organizer, I want basic aggregate stats (avg time saved, completeness rate) to
    report camp impact.

## System / Non-functional (traceable to Round-1 feedback)
15. As a product owner, I want ASR accuracy, intake completeness, doctor correction rate,
    and time-saved metrics captured automatically, so we can produce the quantitative
    validation the evaluation panel asked for.
16. As a product owner, I want the system validated across multiple Indic languages,
    dialects, accents, and noisy environments before large-scale deployment, so pilot
    testing must include real multilingual, real-environment audio samples, not just
    clean studio recordings.
17. As a compliance-minded stakeholder, I want no converted/AI-generated data to reach any
    "real-time" or downstream clinical platform without doctor validation, so the
    verify-gate must be structurally unbypassable in the API (no endpoint marks data usable
    except the doctor verify action).
