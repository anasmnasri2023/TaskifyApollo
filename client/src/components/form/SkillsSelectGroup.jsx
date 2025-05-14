import React, { useState, useEffect } from "react";
import Select from "react-select";
import axios from "axios";

// Core skills - a smaller, focused list
const CORE_SKILLS = [
    {
      label: "Popular Skills",
      options: [
        { value: "JavaScript", label: "JavaScript" },
        { value: "Python", label: "Python" },
        { value: "React", label: "React" },
        { value: "Node.js", label: "Node.js" },
        { value: "Java", label: "Java" },
        { value: "HTML/CSS", label: "HTML/CSS" },
        { value: "AWS", label: "AWS" },
        { value: "SQL", label: "SQL" },
        { value: "Git", label: "Git" },
        { value: "Docker", label: "Docker" }
      ]
    },
    {
      label: "Programming Languages",
      options: [
        { value: "JavaScript", label: "JavaScript" },
        { value: "Python", label: "Python" },
        { value: "Java", label: "Java" },
        { value: "TypeScript", label: "TypeScript" },
        { value: "Ruby", label: "Ruby" }
      ]
    },
    {
      label: "Web Technologies",
      options: [
        { value: "React", label: "React" },
        { value: "Node.js", label: "Node.js" },
        { value: "Angular", label: "Angular" },
        { value: "Vue", label: "Vue.js" },
        { value: "Express", label: "Express" }
      ]
    },
    {
      label: "Cloud & DevOps",
      options: [
        { value: "Docker", label: "Docker" },
        { value: "Kubernetes", label: "Kubernetes" },
        { value: "AWS", label: "AWS" },
        { value: "Azure", label: "Azure" },
        { value: "Google Cloud", label: "Google Cloud" }
      ]
    },
    {
      label: "Databases",
      options: [
        { value: "MongoDB", label: "MongoDB" },
        { value: "PostgreSQL", label: "PostgreSQL" },
        { value: "MySQL", label: "MySQL" },
        { value: "Redis", label: "Redis" },
        { value: "SQLite", label: "SQLite" }
      ]
    },
    {
      label: "Data Science & AI",
      options: [
        { value: "Machine Learning", label: "Machine Learning" },
        { value: "Data Science", label: "Data Science" },
        { value: "TensorFlow", label: "TensorFlow" },
        { value: "PyTorch", label: "PyTorch" },
        { value: "Pandas", label: "Pandas" }
      ]
    },
    {
      label: "Mobile Development",
      options: [
        { value: "React Native", label: "React Native" },
        { value: "Flutter", label: "Flutter" },
        { value: "Swift", label: "Swift" },
        { value: "Kotlin", label: "Kotlin" },
        { value: "Xamarin", label: "Xamarin" }
      ]
    },
    {
      label: "Other Skills",
      options: [
        { value: "Git", label: "Git" },
        { value: "Agile", label: "Agile" },
        { value: "Scrum", label: "Scrum" },
        { value: "UI/UX Design", label: "UI/UX Design" },
        { value: "SEO", label: "SEO" }
      ]
    }
];

const SkillsSelectGroup = ({
  label = "Skills",
  name = "skills",
  disabled = false,
  errors,
  action,
  required = false,
  defaultValue = [],
  className,
  maxSkills = 10
}) => {
  const [options, setOptions] = useState(CORE_SKILLS);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Fetch skill suggestions when user types
  useEffect(() => {
    if (!inputValue || inputValue.length < 2) return;
    
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        // Datamuse API - word association API (very lightweight)
        const response = await axios.get(
          `https://api.datamuse.com/words?ml=${inputValue}&max=8`
        );
        
        if (response.data && response.data.length > 0) {
          // Format suggestions for react-select
          const suggestions = response.data
            .filter(item => item.word.length > 2) // Filter out very short words
            .map(item => ({
              value: formatSkill(item.word),
              label: formatSkill(item.word)
            }));
          
          if (suggestions.length > 0) {
            // Combine with core skills
            const newOptions = [...CORE_SKILLS];
            
            // Add as "Suggestions" category
            newOptions.unshift({
              label: "Suggestions",
              options: suggestions
            });
            
            setOptions(newOptions);
            setApiError(null);
          }
        }
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setApiError("Couldn't load suggestions");
      } finally {
        setIsLoading(false);
      }
    }, 300); // Debounce for 300ms
    
    return () => clearTimeout(timer);
  }, [inputValue]);
  
  // Allow creating custom skills with enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue && inputValue.trim().length > 1) {
      // Check if the skill already exists in the selected skills
      const skillExists = defaultValue.some(
        skill => skill.value.toLowerCase() === inputValue.toLowerCase()
      );
      
      if (!skillExists) {
        const newSkill = { value: inputValue, label: inputValue };
        action([...defaultValue, newSkill]);
        setInputValue('');
        e.preventDefault(); // Prevent form submission
      }
    }
  };
  
  // Helper to format skill names
  const formatSkill = (skill) => {
    return skill
      .split(/[-_ ]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Custom styles to match Tailwind CSS and dark mode
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: 'transparent',
      borderColor: state.isFocused ? '#3C50E0' : '#E2E8F0',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#3C50E0'
      }
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'white',
      color: 'black'
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3C50E0' : 'white',
      color: state.isSelected ? 'white' : 'black',
      '&:hover': {
        backgroundColor: '#8098F9'
      }
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: '#EEF2FF',
      color: '#3C50E0'
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: '#3C50E0'
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: '#3C50E0',
      '&:hover': {
        backgroundColor: '#3C50E0',
        color: 'white'
      }
    })
  };

  return (
    <div className="mb-4.5">
      <label className="mb-2.5 block font-medium text-black dark:text-white">
        {label} {required && <span className="text-meta-1">*</span>}
      </label>

      <div className="relative">
        <Select
          options={options}
          name={name}
          isMulti
          isClearable
          isDisabled={disabled || isLoading}
          isLoading={isLoading}
          onChange={action}
          onKeyDown={handleKeyDown}
          defaultValue={defaultValue}
          onInputChange={(value) => setInputValue(value)}
          styles={customStyles}
          placeholder="Select or type skills (press Enter to add custom)"
          noOptionsMessage={() => "Type to search or press Enter to add a custom skill"}
          
          // Limit maximum number of skills
          isOptionDisabled={() => 
            defaultValue && defaultValue.length >= maxSkills
          }
        />
      </div>
      
      {/* Error handling */}
      {errors && (
        <div className="text-sm text-meta-1 mt-1">
          {errors}
        </div>
      )}

      {/* API error message */}
      {apiError && (
        <div className="text-xs text-gray-500 mt-1">
          {apiError}
        </div>
      )}

      {/* Skills count indicator */}
      <div className="text-xs text-gray-500 mt-1">
        {defaultValue?.length || 0}/{maxSkills} skills selected
      </div>
    </div>
  );
};

export default SkillsSelectGroup;