// routes/tenant/competitors.js
const express = require('express');
const router = express.Router();

// --- Fake Database (Replace with your MongoDB Mongoose calls later) ---
let competitorsDB = [
  { id: 1, name: 'Amazon', mappingType: 'EAN', isActive: true, lastSync: '2026-04-02 11:35:00am', color: '#ff9900', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
  { id: 2, name: 'Croma', mappingType: 'EAN', isActive: false, lastSync: '2026-04-01 09:12:00am', color: '#00b0ab', logo: '' },
  { id: 3, name: 'Vasanth & Co', mappingType: 'URL', isActive: true, lastSync: '2026-04-02 10:20:00am', color: '#d32f2f', logo: '' }
];

// 1. GET all competitors
// Route: GET /api/competitors/
router.get('/', (req, res) => {
  // Simulating a fast network request
  setTimeout(() => {
    res.status(200).json(competitorsDB);
  }, 300);
});

// 2. POST to add a new competitor
// Route: POST /api/competitors/
router.post('/', (req, res) => {
  const newComp = req.body;
  
  const createdCompetitor = {
    id: Date.now(), // Generate a unique ID (MongoDB handles this automatically later)
    name: newComp.name,
    mappingType: newComp.mappingType, // 'EAN' or 'URL'
    color: newComp.color,
    website: newComp.website,
    searchUrl: newComp.searchUrl,
    isActive: false, // Default to offline when first created
    lastSync: 'Never synced',
    logo: '' // Normally handle file uploads with Multer
  };

  competitorsDB.push(createdCompetitor);
  console.log("New Competitor Added:", createdCompetitor.name);
  
  res.status(201).json(createdCompetitor);
});

// 3. PATCH to toggle the sync status
// Route: PATCH /api/competitors/:id/toggle
router.patch('/:id/toggle', (req, res) => {
  const compId = parseInt(req.params.id);
  const { isActive } = req.body;

  const index = competitorsDB.findIndex(c => c.id === compId);
  
  if (index !== -1) {
    competitorsDB[index].isActive = isActive;
    competitorsDB[index].lastSync = new Date().toLocaleString();
    
    console.log(`${competitorsDB[index].name} is now ${isActive ? 'Online' : 'Offline'}`);
    
    // Simulate backend processing time for the "Syncing" animation
    setTimeout(() => {
      res.status(200).json({ message: "Sync complete", updatedCompetitor: competitorsDB[index] });
    }, 1500); 

  } else {
    res.status(404).json({ message: "Competitor not found" });
  }
});

module.exports = router;