const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const mongoose = require("mongoose");
const axios = require("axios");

const User = mongoose.model("users");

const SKILLS_DATA = [
  { value: "JavaScript", label: "JavaScript" },
  { value: "Python", label: "Python" },
  { value: "React", label: "React" },
  { value: "Node.js", label: "Node.js" },
  { value: "Java", label: "Java" },
  { value: "HTML/CSS", label: "HTML/CSS" },
  { value: "AWS", label: "AWS" },
  { value: "SQL", label: "SQL" },
  { value: "Git", label: "Git" },
  { value: "Docker", label: "Docker" },
  { value: "TypeScript", label: "TypeScript" },
  { value: "Ruby", label: "Ruby" },
  { value: "Angular", label: "Angular" },
  { value: "Vue", label: "Vue.js" },
  { value: "Express", label: "Express" },
  { value: "Kubernetes", label: "Kubernetes" },
  { value: "Azure", label: "Azure" },
  { value: "Google Cloud", label: "Google Cloud" },
  { value: "MongoDB", label: "MongoDB" },
  { value: "PostgreSQL", label: "PostgreSQL" },
  { value: "MySQL", label: "MySQL" },
  { value: "Redis", label: "Redis" },
  { value: "SQLite", label: "SQLite" },
  { value: "Machine Learning", label: "Machine Learning" },
  { value: "Data Science", label: "Data Science" },
  { value: "TensorFlow", label: "TensorFlow" },
  { value: "PyTorch", label: "PyTorch" },
  { value: "Pandas", label: "Pandas" },
  { value: "React Native", label: "React Native" },
  { value: "Flutter", label: "Flutter" },
  { value: "Swift", label: "Swift" },
  { value: "Kotlin", label: "Kotlin" },
  { value: "Xamarin", label: "Xamarin" },
  { value: "Agile", label: "Agile" },
  { value: "Scrum", label: "Scrum" },
  { value: "UI/UX Design", label: "UI/UX Design" },
  { value: "SEO", label: "SEO" }
];

const SKILL_SYNONYMS = {
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
  "ui design": "UI/UX Design"
};

const getAllSkills = () => SKILLS_DATA.map(skill => skill.value);

router.get("/test", (req, res) => {
  return res.json({ message: "Smart Assign Router is working" });
});

router.post("/predict-skills", async (req, res) => {
  try {
    const { description } = req.body;
    if (!description) return res.status(400).json({ msg: "Description is required" });

    // Call local NLP service
    let externalSkills = [];
    try {
      const response = await axios.post("http://127.0.0.1:9000/predict-skills", { description });
      externalSkills = response.data.skills || [];
      console.log("NLP Service returned skills:", externalSkills); // Debug log
    } catch (err) {
      console.warn("External NLP failed:", err.message);
      console.warn("Falling back to internal logic.");
    }

    const descriptionLower = description.toLowerCase().replace(/[^a-z0-9\s\.\-\+\/]/gi, ' ');
    const extractedSkills = new Set([...externalSkills]);
    const allSkills = getAllSkills();

    for (const skill of allSkills) {
      const escapedSkill = skill.toLowerCase().replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      if (new RegExp('\\b' + escapedSkill + '\\b', 'i').test(descriptionLower)) {
        extractedSkills.add(skill);
        console.log(`Found skill via regex: ${skill}`); // Debug log
      }
    }

    for (const [synonym, skill] of Object.entries(SKILL_SYNONYMS)) {
      if (new RegExp(`\\b${synonym}\\b`, 'i').test(descriptionLower)) {
        extractedSkills.add(skill);
        console.log(`Found skill via synonym (${synonym}): ${skill}`); // Debug log
      }
    }

    if (descriptionLower.includes("engineer")) extractedSkills.add("ENGINEER");
    if (descriptionLower.includes("project manager")) extractedSkills.add("PM");

    // Special case for cloud infrastructure
    if (descriptionLower.includes("cloud") && 
        (descriptionLower.includes("infra") || descriptionLower.includes("infrastructure"))) {
      extractedSkills.add("AWS");
      extractedSkills.add("Azure");
      extractedSkills.add("Google Cloud");
      console.log("Added cloud infrastructure skills"); // Debug log
    }

    const skillsArray = Array.from(extractedSkills)
      .slice(0, 10)
      .map(skill => SKILLS_DATA.find(s => s.value === skill) || { value: skill, label: skill });

    console.log("Final skills array:", skillsArray); // Debug log
    return res.json({ skills: skillsArray });
  } catch (err) {
    console.error("Error detecting skills:", err.message);
    return res.status(500).json({ msg: "Server Error" });
  }
});

router.post("/find-matching-users", async (req, res) => {
  try {
    const { skills } = req.body;
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({ msg: "Skills array is required" });
    }

    const skillValues = skills.map(skill => (skill.value || skill).toLowerCase().trim());
    const users = await User.find({}, { fullName: 1, email: 1, picture: 1, skills: 1, roles: 1 }).lean();

    const recommendedUsers = users.map(user => {
      const userSkills = (user.skills || []).map(s => s.toLowerCase().trim());
      const matchedSkills = userSkills.filter(skill => skillValues.includes(skill));
      const matchScore = skillValues.length > 0 
        ? Math.round((matchedSkills.length / skillValues.length) * 100) 
        : 0;
      const isEngineerMatch = skillValues.includes("engineer") && user.roles?.includes("ENGINEER");

      return {
        _id: user._id.toString(),
        fullName: user.fullName,
        email: user.email,
        picture: user.picture,
        matchScore,
        matchedSkills,
        roleMatch: isEngineerMatch
      };
    })
    .filter(user => user.matchScore > 0 || user.roleMatch)
    .sort((a, b) => b.matchScore - a.matchScore);

    return res.json({ recommendedUsers });
  } catch (err) {
    console.error("Error finding matching users:", err.message);
    return res.status(500).json({ msg: "Server Error" });
  }
});

module.exports = router;