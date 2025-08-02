# Documentation Overview

*Updated: August 1, 2025*

This directory contains all documentation for the Interactor project, organized by target audience for maximum effectiveness.

---

## 📁 **Folder Structure**

### [`ai/`](ai/) - For AI Agents  
Documentation optimized for AI development agents:
- **[AI_AGENT_START_HERE.md](ai/AI_AGENT_START_HERE.md)** - Essential onboarding and rules
- **[AI_QUICK_REFERENCE.md](ai/AI_QUICK_REFERENCE.md)** - Copy-paste patterns and examples
- **[TEMPLATE_INPUT_MODULE.md](ai/TEMPLATE_INPUT_MODULE.md)** - Complete input module template
- **[TEMPLATE_OUTPUT_MODULE.md](ai/TEMPLATE_OUTPUT_MODULE.md)** - Complete output module template  
- **[AI_FRIENDLY_ARCHITECTURE_RULES.md](ai/AI_FRIENDLY_ARCHITECTURE_RULES.md)** - Architecture guidelines

### [`human/`](human/) - For Human Developers
Comprehensive documentation for human developers:
- **[DeveloperOnboarding.md](human/DeveloperOnboarding.md)** - Complete system overview and concepts
- **[MODULE_DEVELOPMENT.md](human/MODULE_DEVELOPMENT.md)** - Detailed module creation guide
- **[API_GUIDE.md](human/API_GUIDE.md)** - REST API and WebSocket documentation
- **[FRONTEND_ARCHITECTURE.md](human/FRONTEND_ARCHITECTURE.md)** - Frontend design patterns
- **[REACT_FLOW_PERFORMANCE_GUIDE.md](human/REACT_FLOW_PERFORMANCE_GUIDE.md)** - Performance optimization
- **[HISTORICAL_DOCS/](human/HISTORICAL_DOCS/)** - Previous versions and archived documentation

---

## 🎯 **Quick Navigation**

### **I'm an AI Agent**
→ Start here: [`ai/AI_AGENT_START_HERE.md`](ai/AI_AGENT_START_HERE.md)

### **I'm a Human Developer**
→ Start here: [`human/DeveloperOnboarding.md`](human/DeveloperOnboarding.md)

### **I need the current project status**
→ See: [`../CURRENT_STATUS_AND_TODOS.md`](../CURRENT_STATUS_AND_TODOS.md)

### **I want to create a module**
- **AI Agent**: Use [`ai/TEMPLATE_INPUT_MODULE.md`](ai/TEMPLATE_INPUT_MODULE.md) or [`ai/TEMPLATE_OUTPUT_MODULE.md`](ai/TEMPLATE_OUTPUT_MODULE.md)
- **Human Developer**: Read [`human/MODULE_DEVELOPMENT.md`](human/MODULE_DEVELOPMENT.md)

### **I need API reference**
→ See: [`human/API_GUIDE.md`](human/API_GUIDE.md)

---

## 📋 **Documentation Principles** 

### **For AI Agents**
- **Template-driven**: Copy-paste ready examples
- **Constraint-focused**: Clear rules about what NOT to do
- **Pattern-consistent**: Same structure for all modules
- **Progressive**: Start simple, add complexity gradually

### **For Human Developers**  
- **Comprehensive**: Full context and background
- **Concept-driven**: Explain why, not just how
- **Reference-quality**: Detailed specifications
- **Troubleshooting**: Common issues and solutions

---

## 🔄 **Documentation Maintenance**

### **When to Update**
- **Architecture changes**: Update both ai/ and human/ folders
- **New modules**: Add examples to templates
- **API changes**: Update API_GUIDE.md
- **Process changes**: Update DeveloperOnboarding.md

### **Keeping AI Documentation Effective**
- Test templates with actual AI agents
- Keep examples working and current
- Update constraints when architecture changes
- Verify templates match current base classes

### **Keeping Human Documentation Accurate**
- Update when core concepts change
- Add troubleshooting for new common issues
- Maintain historical context in HISTORICAL_DOCS
- Cross-reference between related documents

---

## 🎪 **Documentation Philosophy**

This organization reflects the reality that **AI agents and human developers have different needs**:

- **AI agents** excel with templates, patterns, and constraints
- **Human developers** need context, concepts, and comprehensive references

By separating these concerns, we optimize the developer experience for both audiences while maintaining consistency in the underlying system architecture.

---

*For the most current project status and known issues, always check [`../CURRENT_STATUS_AND_TODOS.md`](../CURRENT_STATUS_AND_TODOS.md)*