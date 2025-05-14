## 🔧 FastAPI Skill Extractor Setup (Local)

This backend service extracts skills from a text description using spaCy and FastAPI.

### 📦 Requirements

- Python 3.8+
- Git (optional)
- `venv` module (built-in with Python)

---

### 🛠️ Setup Instructions

1. Clone the repository and `cd` into the server folder:
   ```bash
   cd Taskify/server
   ```

2. Create a new virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the environment:
   - On **Windows**:
     ```bash
     .\venv\Scripts\activate
     ```
   - On **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```

4. Install the required packages:
   ```bash
   pip install -r requirements.txt
   ```
pip install fastapi uvicorn spacy
python -m spacy download en_core_web_sm

5. Download the spaCy model:
   ```bash
   python -m spacy download en_core_web_sm
   ```

6. Run the FastAPI server:
   ```bash
   uvicorn skill_nlp_service:app --host 127.0.0.1 --port 9000
   ```

---

### ✅ API Endpoint

- `POST /predict-skills`
- Body:
  ```json
  { "description": "Looking for a frontend engineer with React and TypeScript" }
  ```

- Returns:
  ```json
  { "skills": ["React", "TypeScript", "JavaScript", "HTML/CSS"] }
  ```

---

### 🧪 Testing

Use Postman, curl, or your app frontend to send requests to:
```
http://127.0.0.1:9000/predict-skills
```
