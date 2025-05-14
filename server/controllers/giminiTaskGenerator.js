const ProjectModel = require("../models/projet");

const { GoogleGenerativeAI } = require("@google/generative-ai");

// Replace with your Gemini API key
const API_KEY = "AIzaSyBODX2-l6ayddwqCVUCoACsoKr-DrS3xJc";

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY);

async function suggestTasks(projectDescription,title) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
Given the following project description, and title ,  suggest exactly 4 task titles with short descriptions for each. 
Format your response as a JSON array like this:
[
  {
    "title": "Task Title",
    "description": "Task description"
  },
  ...
]

Project Description: ${projectDescription}
Project title : ${title}
    `;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Try to parse the response as JSON
    const jsonStart = text.indexOf("[");
    const jsonEnd = text.lastIndexOf("]") + 1;
    const json = text.substring(jsonStart, jsonEnd);

    return JSON.parse(json);
  } // To this more detailed version:
  catch (err) {
    console.error("Error generating tasks - Full details:", err);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    return [];
  }
}



const GenerateTasks = async (req, res) => {
  try {
    const {projectId}=req.body;

    if (!projectId) {
      return res.status(404).json({ comment: "Required project Id" });
    }
  console.log(projectId);
    const project = await ProjectModel.findById(projectId);
    if(!project){
        return res.status(404).json({ comment: "Project not foud" });
    }
    const {project_name,project_description}=project;
    const result=await suggestTasks(project_description,project_name);
    // const taskOwner = await taskOwner.findOne("")
    // socket.io.to(socket.methods.getUserSockets(taskOwner)).emit("notification", data)
    return res.status(201).send({
      result
    });
  } catch (error) {
    console.log(error);
    res.status(500).send(error.message);
  }
};
module.exports = {GenerateTasks};