import pytest
from cleaner.text_cleaner import TextCleaner

def test_unicode_normalization():
    text = "The resume of naïve candidate with ﬁgures."
    cleaned = TextCleaner.clean(text)
    assert "naïve" not in cleaned or "figures" in cleaned # ligatures replaced

def test_remove_page_numbers():
    text = "Experience\nPage 1 of 2\nEducation\n- 2 -\nProjects\n3 | Page\nSkills"
    cleaned = TextCleaner.clean(text)
    assert "Page 1 of 2" not in cleaned
    assert "- 2 -" not in cleaned
    assert "3 | Page" not in cleaned
    assert "Experience\nEducation\nProjects\nSkills" in cleaned

def test_duplicate_words():
    text = "software software engineer"
    cleaned = TextCleaner.clean(text)
    assert "software engineer" in cleaned
    assert "software software engineer" not in cleaned
