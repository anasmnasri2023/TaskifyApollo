from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import spacy
import re
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("skill_nlp")

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
    logger.info("Loaded spaCy model successfully")
except OSError:
    import sys
    import subprocess
    logger.warning("spaCy model not found, downloading...")
    subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
    nlp = spacy.load("en_core_web_sm")
    logger.info("Downloaded and loaded spaCy model")

# Direct skill detection - matching your Node.js SKILLS_DATA array
SKILLS_DATA = [
    "JavaScript", "Python", "React", "Node.js", "Java", "HTML/CSS", 
    "AWS", "SQL", "Git", "Docker", "TypeScript", "Ruby", "Angular", 
    "Vue.js", "Express", "Kubernetes", "Azure", "Google Cloud", 
    "MongoDB", "PostgreSQL", "MySQL", "Redis", "SQLite", 
    "Machine Learning", "Data Science", "TensorFlow", "PyTorch", 
    "Pandas", "React Native", "Flutter", "Swift", "Kotlin", 
    "Xamarin", "Agile", "Scrum", "UI/UX Design", "SEO"
]

# Matching your Node.js SKILL_SYNONYMS object
SKILL_SYNONYMS = {
    "js": "JavaScript",
    "typescript": "TypeScript",
    "ts": "TypeScript",
    "reactjs": "React",
    "react.js": "React",
    "nodejs": "Node.js",
    "node": "Node.js",
    "html": "HTML/CSS",
    "css": "HTML/CSS",
    "postgres": "PostgreSQL",
    "mongo": "MongoDB",
    "k8s": "Kubernetes",
    "python3": "Python",
    "ml": "Machine Learning",
    "ai": "Machine Learning",
    "artificial intelligence": "Machine Learning",
    "ux design": "UI/UX Design",
    "ui design": "UI/UX Design",
    # Additional synonyms to catch special cases
    "cloud": "AWS",
    "infra": "AWS",
    "infrastructure": "AWS",
    "web": "HTML/CSS"
}

# Topic-based skill mapping for broader contexts
TOPIC_SKILL_MAP = {
    "frontend": ["React", "JavaScript", "HTML/CSS", "Angular", "Vue.js"],
    "backend": ["Node.js", "Express", "Python", "Java", "MongoDB", "SQL"],
    "fullstack": ["React", "Node.js", "MongoDB", "JavaScript"],
    "mobile": ["React Native", "Flutter", "Swift", "Kotlin"],
    "cloud": ["AWS", "Azure", "Google Cloud"],
    "devops": ["Docker", "Kubernetes", "Git"],
    "ui": ["UI/UX Design", "HTML/CSS"],
    "ai": ["Machine Learning", "Data Science", "TensorFlow", "PyTorch"],
}

class Description(BaseModel):
    description: str

@app.get("/")
def read_root():
    return {"message": "NLP Service is running"}

@app.get("/test")
def test():
    logger.info("Test endpoint called")
    return {"message": "NLP Service is working!"}

@app.post("/predict-skills")
def predict_skills(payload: Description):
    text = payload.description.lower()
    logger.info(f"Processing description: {text}")
    
    doc = nlp(text)
    extracted = set()
    
    # 1. Direct skill matching
    for skill in SKILLS_DATA:
        skill_lower = skill.lower()
        pattern = r'\b' + re.escape(skill_lower) + r'\b'
        if re.search(pattern, text, re.IGNORECASE):
            logger.info(f"Found direct skill match: {skill}")
            extracted.add(skill)
    
    # 2. Check for synonyms
    for synonym, skill in SKILL_SYNONYMS.items():
        pattern = r'\b' + re.escape(synonym.lower()) + r'\b'
        if re.search(pattern, text, re.IGNORECASE):
            logger.info(f"Found synonym match: {synonym} → {skill}")
            extracted.add(skill)
    
    # 3. Check for topics and add their skills
    for topic, skills in TOPIC_SKILL_MAP.items():
        if re.search(r'\b' + re.escape(topic) + r'\b', text, re.IGNORECASE):
            logger.info(f"Found topic: {topic}, adding skills: {skills}")
            extracted.update(skills)
    
    # 4. Special case for cloud infrastructure
    if "cloud" in text and any(word in text for word in ["infra", "infrastructure"]):
        logger.info("Found cloud infrastructure reference")
        extracted.add("AWS")
        extracted.add("Azure")
        extracted.add("Google Cloud")
    
    # 5. Special roles
    if "engineer" in text:
        logger.info("Found engineer role")
        extracted.add("ENGINEER")
    if "project manager" in text or "pm" in text:
        logger.info("Found project manager role")
        extracted.add("PM")
    
    result = list(extracted)
    logger.info(f"Final skills detected: {result}")
    return {"skills": result}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=9000)