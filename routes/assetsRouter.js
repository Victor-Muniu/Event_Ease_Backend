const express = require('express');
const Asset = require('../models/assets');


const router = express.Router();


router.post('/assets', async (req, res) => {
    try {
        const {
            name,
            description,
            type,
            purchaseDate,
            cost,
            location,
            condition,
            status,
            maintenanceHistory,
            images,
        } = req.body;

        const asset = new Asset({
            name,
            description,
            type,
            purchaseDate,
            cost,
            location,
            condition,
            status,
            maintenanceHistory,
            images,
        });

        await asset.save();
        res.status(201).json({ message: 'Asset created successfully', asset });
    } catch (err) {
        console.error('Error creating asset:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.get('/assets',  async (req, res) => {
    try {
        const assets = await Asset.find();
        res.status(200).json(assets);
    } catch (err) {
        console.error('Error fetching assets:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


router.get('/assets/:id',  async (req, res) => {
    try {
        const asset = await Asset.findById(req.params.id);

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        res.status(200).json(asset);
    } catch (err) {
        console.error('Error fetching asset:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});


router.patch('/assets/:id',  async (req, res) => {
    try {
        const updates = req.body;
        const asset = await Asset.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true,
        });

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        res.status(200).json({ message: 'Asset updated successfully', asset });
    } catch (err) {
        console.error('Error updating asset:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

router.delete('/assets/:id',async (req, res) => {
    try {
        const asset = await Asset.findByIdAndDelete(req.params.id);

        if (!asset) {
            return res.status(404).json({ message: 'Asset not found' });
        }

        res.status(200).json({ message: 'Asset deleted successfully' });
    } catch (err) {
        console.error('Error deleting asset:', err.message);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
