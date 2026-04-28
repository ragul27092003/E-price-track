const { ObjectId } = require('mongodb');

exports.getAll = async (req, res) => {
  try {
    const labels = await req.tenantDb.collection('custom_labels').find({}).toArray();
    res.json(labels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const result = await req.tenantDb.collection('custom_labels')
      .insertOne({ ...req.body, createdAt: new Date() });
    res.status(201).json({ message: 'Label created', id: result.insertedId });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    await req.tenantDb.collection('custom_labels').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { ...req.body, updatedAt: new Date() } }
    );
    res.json({ message: 'Label updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await req.tenantDb.collection('custom_labels').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ message: 'Label deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
