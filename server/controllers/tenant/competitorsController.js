let competitorsDB = [
  { id: 1, name: 'Amazon',      mappingType: 'EAN', isActive: true,  lastSync: '2026-04-02 11:35:00am', color: '#ff9900', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' },
  { id: 2, name: 'Croma',       mappingType: 'EAN', isActive: false, lastSync: '2026-04-01 09:12:00am', color: '#00b0ab', logo: '' },
  { id: 3, name: 'Vasanth & Co',mappingType: 'URL', isActive: true,  lastSync: '2026-04-02 10:20:00am', color: '#d32f2f', logo: '' },
];

exports.getAll = (req, res) => {
  setTimeout(() => res.status(200).json(competitorsDB), 300);
};

exports.create = (req, res) => {
  const { name, mappingType, color, website, searchUrl } = req.body;
  const created = {
    id:          Date.now(),
    name,
    mappingType,
    color,
    website,
    searchUrl,
    isActive:    false,
    lastSync:    'Never synced',
    logo:        '',
  };
  competitorsDB.push(created);
  res.status(201).json(created);
};

exports.toggleSync = (req, res) => {
  const compId    = parseInt(req.params.id);
  const { isActive } = req.body;
  const index     = competitorsDB.findIndex(c => c.id === compId);

  if (index === -1)
    return res.status(404).json({ message: 'Competitor not found' });

  competitorsDB[index].isActive = isActive;
  competitorsDB[index].lastSync = new Date().toLocaleString();

  setTimeout(() => {
    res.status(200).json({ message: 'Sync complete', updatedCompetitor: competitorsDB[index] });
  }, 1500);
};
