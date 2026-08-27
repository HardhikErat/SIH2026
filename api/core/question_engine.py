"""Adaptive Question Engine — 14_AI_NLP_Architecture §6. Deterministic, no LLM."""

from __future__ import annotations

from core.conversation_memory import select_unasked_candidates
from core.schema import CollectedFields, ConsultationPhase, Question

MAX_QUESTIONS = 10

GENERIC_FOLLOWUP = Question(
    id="Q_GENERIC",
    complaint_category="default",
    field="chief_complaint",
    question_text_key="generic_followup",
    question_text={
        "en": "Please tell me a little more about what is bothering you.",
        "hi": "कृपया बताइए और क्या तकलीफ है।",
        "mr": "कृपया आणखी काय त्रास आहे ते सांगा.",
    },
    priority_order=999,
)

# Basic details questions — asked before any medical questions.
BASIC_DETAILS_QUESTIONS: list[Question] = [
    Question(
        id="Q_NAME",
        complaint_category="*",
        field="display_name",
        question_text_key="ask_name",
        question_text={
            "en": "What is your name?",
            "hi": "आपका नाम क्या है?",
            "mr": "तुमचे नाव काय आहे?",
        },
        priority_order=0,
    ),
    Question(
        id="Q_AGE",
        complaint_category="*",
        field="age",
        question_text_key="ask_age",
        question_text={
            "en": "How old are you?",
            "hi": "आपकी उम्र क्या है?",
            "mr": "तुमचे वय किती आहे?",
        },
        priority_order=1,
    ),
    Question(
        id="Q_GENDER",
        complaint_category="*",
        field="gender",
        question_text_key="ask_gender",
        question_text={
            "en": "What is your gender? (Male / Female / Other)",
            "hi": "आपका लिंग क्या है? (पुरुष / महिला / अन्य)",
            "mr": "तुमचे लिंग काय आहे? (पुरुष / स्त्री / इतर)",
        },
        priority_order=2,
    ),
    Question(
        id="Q_AADHAAR",
        complaint_category="*",
        field="aadhaar_last4",
        question_text_key="ask_aadhaar",
        question_text={
            "en": "Please share your 12-digit Aadhaar number. It helps us find your earlier visits securely.",
            "hi": "कृपया अपना 12 अंकों का आधार नंबर बताएं। इससे हम आपकी पिछली विज़िट सुरक्षित रूप से ढूँढ सकेंगे।",
            "mr": "कृपया तुमचा 12 अंकी आधार क्रमांक सांगा. यामुळे आम्ही तुमच्या आधीच्या भेटी सुरक्षितपणे शोधू शकतो.",
        },
        priority_order=3,
    ),
]

# Seed question bank (also persisted in Supabase question_bank). Clinician-editable data.
QUESTION_BANK: list[Question] = [
    Question(
        id="Q_DURATION",
        complaint_category="*",
        field="duration",
        question_text_key="ask_duration",
        question_text={
            "en": "How many days has this been going on?",
            "hi": "यह कितने दिनों से है?",
            "mr": "हे किती दिवसांपासून आहे?",
        },
        priority_order=10,
    ),
    Question(
        id="Q_SEVERITY",
        complaint_category="*",
        field="severity",
        question_text_key="ask_severity",
        question_text={
            "en": "Is the pain or discomfort mild, moderate, or severe?",
            "hi": "तकलीफ हल्की है, मध्यम है, या तेज है?",
            "mr": "त्रास हलका, मध्यम की तीव्र आहे?",
        },
        priority_order=20,
    ),
    Question(
        id="Q_MEDS",
        complaint_category="*",
        field="medications",
        question_text_key="ask_medications",
        question_text={
            "en": "Are you taking any medicine for this? If yes, which one?",
            "hi": "क्या आप कोई दवाई ले रहे हैं? अगर हाँ, तो कौन सी?",
            "mr": "तुम्ही यासाठी औषध घेत आहात का? असल्यास कोणते?",
        },
        priority_order=30,
    ),
    Question(
        id="Q_MED_NAME",
        complaint_category="*",
        field="medications",
        question_text_key="ask_medication_name",
        question_text={
            "en": "Which medicine are you taking? If you don't remember the name, just say so.",
            "hi": "आप कौन सी दवाई ले रहे हैं? नाम याद नहीं है तो बता दीजिए।",
            "mr": "तुम्ही कोणते औषध घेत आहात? नाव आठवत नसेल तर सांगा.",
        },
        priority_order=31,
    ),
    Question(
        id="Q_ALLERGY",
        complaint_category="*",
        field="allergies",
        question_text_key="ask_allergies",
        question_text={
            "en": "Do you have any medicine or food allergies?",
            "hi": "क्या आपको किसी दवाई या खाने से एलर्जी है?",
            "mr": "तुम्हाला कोणत्या औषध किंवा अन्नाची अॅलर्जी आहे का?",
        },
        priority_order=40,
    ),
    Question(
        id="Q_CHEST_BREATH",
        complaint_category="chest_pain",
        field="breathing_difficulty",
        question_text_key="ask_breathing",
        question_text={
            "en": "Is it hard to breathe along with the chest pain?",
            "hi": "सीने के दर्द के साथ सांस लेने में तकलीफ भी है क्या?",
            "mr": "छातीच्या दुखण्यासोबत श्वास घ्यायला त्रास होतो का?",
        },
        priority_order=5,
    ),
    Question(
        id="Q_CHEST_ONSET",
        complaint_category="chest_pain",
        field="onset",
        question_text_key="ask_onset",
        question_text={
            "en": "Did the chest pain start suddenly, or gradually?",
            "hi": "सीने का दर्द अचानक शुरू हुआ या धीरे-धीरे?",
            "mr": "छातीचे दुखणे अचानक सुरू झाले की हळूहळू?",
        },
        priority_order=8,
    ),
    Question(
        id="Q_FEVER_ASSOC",
        complaint_category="fever",
        field="associated_symptoms_checked",
        question_text_key="ask_fever_assoc",
        question_text={
            "en": "Along with fever, is there cough, headache, or body pain?",
            "hi": "बुखार के साथ खांसी, सिर दर्द या बदन दर्द भी है?",
            "mr": "तापासोबत खोकला, डोकेदुखी किंवा अंगदुखी आहे का?",
        },
        priority_order=15,
    ),
    Question(
        id="Q_HEAD_VOMIT",
        complaint_category="headache",
        field="vomiting",
        question_text_key="ask_vomiting",
        question_text={
            "en": "Have you been vomiting with the headache?",
            "hi": "सिर दर्द के साथ उल्टी भी हो रही है क्या?",
            "mr": "डोकेदुखीसोबत उलटी होते का?",
        },
        priority_order=12,
    ),
    Question(
        id="Q_HEAD_FEVER",
        complaint_category="headache",
        field="fever",
        question_text_key="ask_fever_with_headache",
        question_text={
            "en": "Do you also have fever with the headache?",
            "hi": "सिर दर्द के साथ बुखार भी है?",
            "mr": "डोकेदुखीसोबत ताप आहे का?",
        },
        priority_order=14,
    ),
    Question(
        id="Q_COUGH_BREATH",
        complaint_category="cough",
        field="breathing_difficulty",
        question_text_key="ask_cough_breath",
        question_text={
            "en": "Is the cough making it hard to breathe?",
            "hi": "खांसी के साथ सांस लेने में तकलीफ है?",
            "mr": "ख्याकलामुळे श्वास घ्यायला त्रास होतो का?",
        },
        priority_order=12,
    ),
    Question(
        id="Q_COMPLAINT",
        complaint_category="default",
        field="chief_complaint",
        question_text_key="ask_complaint",
        question_text={
            "en": "What is the main problem you came for today?",
            "hi": "आज आप किस तकलीफ के लिए आए हैं?",
            "mr": "आज तुम्ही कोणत्या त्रासासाठी आला आहात?",
        },
        priority_order=1,
    ),
]


def detect_phase(fields: CollectedFields) -> ConsultationPhase:
    """Determine the current consultation phase based on collected fields."""
    has_name = fields.is_collected("display_name")
    has_age = fields.is_collected("age")
    has_gender = fields.gender not in ("unknown", None)
    has_aadhaar = fields.is_collected("aadhaar_last4")
    if not (has_name and has_age and has_gender and has_aadhaar):
        return ConsultationPhase.BASIC_DETAILS
    return ConsultationPhase.CONSULTATION


def select_next_question(
    fields: CollectedFields,
    missing_fields: list[str],
    question_count_so_far: int,
    language: str = "en",
    max_questions: int = MAX_QUESTIONS,
    bank: list[Question] | None = None,
    asked_questions: list[str] | None = None,
) -> Question | None:
    phase = detect_phase(fields)
    asked = asked_questions or []

    if phase == ConsultationPhase.BASIC_DETAILS:
        questions = BASIC_DETAILS_QUESTIONS
        category = "*"
        # Force max_questions to not apply to basic details
    else:
        if question_count_so_far >= max_questions:
            return None
        questions = bank or QUESTION_BANK
        category = fields.complaint_category or "default"

    def matches_category(q: Question) -> bool:
        return q.complaint_category in (category, "*", "default") or (
            category == "default" and q.complaint_category == "default"
        )

    candidates = [
        q
        for q in questions
        if matches_category(q) and not fields.is_collected(q.field)
    ]
    # Drop semantic duplicates / already-asked field questions
    candidates = select_unasked_candidates(candidates, fields, asked)
    candidates = _filter_medication_questions(candidates, fields, asked)

    if missing_fields and phase != ConsultationPhase.BASIC_DETAILS:
        missing_set = set(missing_fields)
        ranked = sorted(
            candidates,
            key=lambda q: (0 if q.field in missing_set else 1, q.priority_order),
        )
    else:
        ranked = sorted(candidates, key=lambda q: q.priority_order)

    if not ranked:
        if phase == ConsultationPhase.BASIC_DETAILS:
            # Transition to consultation phase
            return select_next_question(
                fields,
                missing_fields,
                question_count_so_far,
                language,
                max_questions,
                bank,
                asked_questions=asked,
            )
        if fields.is_collected("chief_complaint") and not missing_fields:
            return None
        # Avoid looping the same generic / complaint prompt after it was already asked
        if any(qid.startswith("Q_GENERIC:") or qid.startswith("Q_COMPLAINT:") for qid in asked):
            return None
        return GENERIC_FOLLOWUP
    return ranked[0]


def _filter_medication_questions(
    candidates: list[Question],
    fields: CollectedFields,
    asked: list[str],
) -> list[Question]:
    """Ask yes/no first; if yes without a name, ask the name once — never both at once."""
    med_name_asked = any(qid.startswith("Q_MED_NAME:") for qid in asked)
    out: list[Question] = []
    for q in candidates:
        if q.field != "medications":
            out.append(q)
            continue
        if fields.takes_medication == "true":
            # Need the name (or a decline) — only the follow-up question
            if q.id == "Q_MED_NAME" and not med_name_asked:
                out.append(q)
        else:
            # Still need the yes/no (+ optional name in one answer)
            if q.id == "Q_MEDS":
                out.append(q)
    return out


def question_text(question: Question, language: str) -> str:
    lang = language.split("-")[0]
    return (
        question.question_text.get(lang)
        or question.question_text.get("en")
        or question.question_text_key
    )
