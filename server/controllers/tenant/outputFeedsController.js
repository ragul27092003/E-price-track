const { ObjectId } = require('mongodb');

exports.getAll = async (req, res) => {
  try {
    const feeds = await req.tenantDb.collection('output_feeds').find({}).toArray();
    res.json(feeds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await req.tenantDb.collection('output_feeds')
      .insertOne({ ...req.body, createdAt: new Date() });
    res.status(201).json({ message: 'Output feed created', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    await req.tenantDb.collection('output_feeds').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...req.body, updatedAt: new Date() } }
    );
    res.json({ message: 'Output feed updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await req.tenantDb.collection('output_feeds').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Output feed deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
