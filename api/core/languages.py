"""22 scheduled Indian languages with honest tier metadata — 11_Localization_Architecture."""

from __future__ import annotations

from core.schema import LanguageOption

# Eighth Schedule languages + English (clinical working language).
LANGUAGES: list[LanguageOption] = [
    LanguageOption(
        code="hi", name="Hindi", native_name="हिन्दी", script="Deva",
        tier=1, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="mr", name="Marathi", native_name="मराठी", script="Deva",
        tier=1, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="en", name="English", native_name="English", script="Latn",
        tier=1, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="bn", name="Bengali", native_name="বাংলা", script="Beng",
        tier=2, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="ta", name="Tamil", native_name="தமிழ்", script="Taml",
        tier=2, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="te", name="Telugu", native_name="తెలుగు", script="Telu",
        tier=2, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="gu", name="Gujarati", native_name="ગુજરાતી", script="Gujr",
        tier=2, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="kn", name="Kannada", native_name="ಕನ್ನಡ", script="Knda",
        tier=2, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="ml", name="Malayalam", native_name="മലയാളം", script="Mlym",
        tier=2, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="pa", name="Punjabi", native_name="ਪੰਜਾਬੀ", script="Guru",
        tier=2, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="or", name="Odia", native_name="ଓଡ଼ିଆ", script="Orya",
        tier=2, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="ur", name="Urdu", native_name="اردو", script="Arab",
        tier=2, asr_supported=True, tts_supported=True,
    ),
    LanguageOption(
        code="as", name="Assamese", native_name="অসমীয়া", script="Beng",
        tier=3, asr_supported=True, tts_supported=False,
    ),
    LanguageOption(
        code="brx", name="Bodo", native_name="बर'", script="Deva",
        tier=3, asr_supported=False, tts_supported=False,
    ),
    LanguageOption(
        code="doi", name="Dogri", native_name="डोगरी", script="Deva",
        tier=3, asr_supported=False, tts_supported=False,
    ),
    LanguageOption(
        code="ks", name="Kashmiri", native_name="कॉशुर", script="Arab",
        tier=3, asr_supported=False, tts_supported=False,
    ),
    LanguageOption(
        code="kok", name="Konkani", native_name="कोंकणी", script="Deva",
        tier=3, asr_supported=False, tts_supported=False,
    ),
    LanguageOption(
        code="mai", name="Maithili", native_name="मैथिली", script="Deva",
        tier=3, asr_supported=False, tts_supported=False,
    ),
    LanguageOption(
        code="mni", name="Manipuri", native_name="ꯃꯩꯇꯩꯂꯣꯟ", script="Mtei",
        tier=3, asr_supported=False, tts_supported=False,
    ),
    LanguageOption(
        code="ne", name="Nepali", native_name="नेपाली", script="Deva",
        tier=3, asr_supported=True, tts_supported=False,
    ),
    LanguageOption(
        code="sa", name="Sanskrit", native_name="संस्कृतम्", script="Deva",
        tier=3, asr_supported=False, tts_supported=False,
    ),
    LanguageOption(
        code="sat", name="Santali", native_name="ᱥᱟᱱᱛᱟᱲᱤ", script="Olck",
        tier=3, asr_supported=False, tts_supported=False,
    ),
    LanguageOption(
        code="sd", name="Sindhi", native_name="سنڌي", script="Arab",
        tier=3, asr_supported=False, tts_supported=False,
    ),
]


def get_language(code: str) -> LanguageOption | None:
    code = code.split("-")[0]
    return next((lang for lang in LANGUAGES if lang.code == code), None)
