"""Adaptive Question Engine — 14_AI_NLP_Architecture §6. Deterministic, no LLM."""

from __future__ import annotations

from core.schema import CollectedFields, Question

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


def select_next_question(
    fields: CollectedFields,
    missing_fields: list[str],
    question_count_so_far: int,
    language: str = "en",
    max_questions: int = MAX_QUESTIONS,
    bank: list[Question] | None = None,
) -> Question | None:
    if question_count_so_far >= max_questions:
        return None

    category = fields.complaint_category or "default"
    questions = bank or QUESTION_BANK

    def matches_category(q: Question) -> bool:
        return q.complaint_category in (category, "*", "default") or (
            category == "default" and q.complaint_category == "default"
        )

    candidates = [
        q
        for q in questions
        if matches_category(q) and not fields.is_collected(q.field)
    ]

    if missing_fields:
        missing_set = set(missing_fields)
        ranked = sorted(
            candidates,
            key=lambda q: (0 if q.field in missing_set else 1, q.priority_order),
        )
    else:
        ranked = sorted(candidates, key=lambda q: q.priority_order)

    if not ranked:
        if fields.is_collected("chief_complaint") and not missing_fields:
            return None
        return GENERIC_FOLLOWUP
    return ranked[0]


def question_text(question: Question, language: str) -> str:
    lang = language.split("-")[0]
    return (
        question.question_text.get(lang)
        or question.question_text.get("en")
        or question.question_text_key
    )
