import os
from jinja2 import Environment, FileSystemLoader
from pathlib import Path

_PROMPTS_DIR = Path(__file__).parent
_jinja_env = Environment(loader=FileSystemLoader(str(_PROMPTS_DIR)), autoescape=False)

def get_prompt(template_name: str, **kwargs) -> str:
    tmpl = _jinja_env.get_template(template_name)
    return tmpl.render(**kwargs)
