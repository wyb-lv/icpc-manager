// server/server.js
const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const app = express();
const PORT = 8000;

// Configure CORS
var corsOptions = {
    origin: 'http://localhost:4200',
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

// ============================================
// CONTEST RESULTS APIs (stored in contest collection)
// ============================================

// Clear results for a specific contest
app.post('/contests/:contestId/clear', async (req, res) => {
    const { contestId } = req.params;
    console.log('=== Received clear contest results request ===', contestId);

    try {
        const contestRef = db.collection('contests').doc(contestId);
        const doc = await contestRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Contest not found.' });
        }

        const contestData = doc.data();
        const teamResults = contestData.teamResults || {};

        // Reset all team results but keep the team info
        const clearedResults = {};
        for (const teamId in teamResults) {
            clearedResults[teamId] = {
                teamName: teamResults[teamId].teamName,
                university: teamResults[teamId].university,
                problems: {},
                totalSolved: 0,
                totalPenalty: 0
            };
        }

        await contestRef.update({
            teamResults: clearedResults,
            updatedAt: new Date().toISOString()
        });

        console.log(`Cleared results for contest ${contestId}`);
        res.json({ success: true, message: 'Contest results cleared.' });
    } catch (error) {
        console.error("Error when clearing results:", error);
        res.status(500).json({ success: false, message: 'Server error when clearing results.' });
    }
});

// Submit judge result for a team in a contest
app.post('/contests/:contestId/judge', async (req, res) => {
    const { contestId } = req.params;
    const { teamId, problemId, result, timestamp } = req.body;

    if (!teamId || !problemId || !result) {
        return res.status(400).json({ success: false, message: "Missing required information" });
    }

    try {
        const contestRef = db.collection('contests').doc(contestId);

        await db.runTransaction(async (t) => {
            const doc = await t.get(contestRef);

            if (!doc.exists) {
                throw new Error('Contest not found');
            }

            const contestData = doc.data();
            const teamResults = contestData.teamResults || {};

            if (!teamResults[teamId]) {
                throw new Error('Team not found in this contest');
            }

            const teamResult = teamResults[teamId];
            let problems = teamResult.problems || {};
            let problem = problems[problemId] || { status: 'NONE', attempts: 0 };

            if (result === 'AC') {
                if (problem.status !== 'AC') {
                    problem.status = 'AC';
                    problem.timestamp = timestamp || 0;
                    const newTotal = (teamResult.totalSolved || 0) + 1;
                    const newPenalty = (teamResult.totalPenalty || 0) + (timestamp || 0);

                    problems[problemId] = problem;
                    teamResults[teamId] = {
                        ...teamResult,
                        problems: problems,
                        totalSolved: newTotal,
                        totalPenalty: newPenalty
                    };

                    t.update(contestRef, {
                        teamResults: teamResults,
                        updatedAt: new Date().toISOString()
                    });
                }
            } else if (result === 'WA') {
                problem.status = 'WA';
                problem.attempts = (problem.attempts || 0) + 1;
                problems[problemId] = problem;
                teamResults[teamId] = {
                    ...teamResult,
                    problems: problems
                };

                t.update(contestRef, {
                    teamResults: teamResults,
                    updatedAt: new Date().toISOString()
                });
            }
        });

        res.json({ success: true, message: `Verdict ${result} updated for team ${teamId}` });
    } catch (error) {
        console.error("Error when judging:", error);
        res.status(500).json({ success: false, message: error.message || 'Server error when judging.' });
    }
});

// Get contest results (teams with their results)
app.get('/contests/:contestId/results', async (req, res) => {
    const { contestId } = req.params;
    console.log('=== Received get contest results request ===', contestId);

    try {
        const contestRef = db.collection('contests').doc(contestId);
        const doc = await contestRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Contest not found.' });
        }

        const contestData = doc.data();
        const teamResults = contestData.teamResults || {};

        // Convert to array and format for frontend (use 'id' and 'name' to match Team interface)
        const resultsArray = Object.entries(teamResults).map(([teamId, data]) => ({
            id: teamId,
            name: data.teamName,
            university: data.university,
            problems: data.problems,
            totalSolved: data.totalSolved,
            totalPenalty: data.totalPenalty
        }));

        resultsArray.sort((a, b) => {
            if (b.totalSolved !== a.totalSolved) {
                return b.totalSolved - a.totalSolved;
            }
            return a.totalPenalty - b.totalPenalty;
        });

        res.json({ success: true, data: resultsArray });
    } catch (error) {
        console.error("Error getting contest results:", error);
        res.status(500).json({ success: false, message: 'Server error when getting results.' });
    }
});

// Add teams to a contest
app.post('/contests/:contestId/teams', async (req, res) => {
    const { contestId } = req.params;
    const { teams } = req.body; // Array of { teamId, teamName, university }
    console.log('=== Received add teams to contest request ===', contestId);
    console.log('Teams:', JSON.stringify(teams));

    if (!teams || !Array.isArray(teams)) {
        return res.status(400).json({ success: false, message: 'Teams array is required.' });
    }

    try {
        const contestRef = db.collection('contests').doc(contestId);
        const doc = await contestRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Contest not found.' });
        }

        const contestData = doc.data();
        const teamResults = contestData.teamResults || {};

        // Add new teams (don't overwrite existing)
        for (const team of teams) {
            if (!teamResults[team.teamId]) {
                teamResults[team.teamId] = {
                    teamName: team.teamName || '',
                    university: team.university || '',  // Default to empty string if undefined
                    problems: {},
                    totalSolved: 0,
                    totalPenalty: 0
                };
            }
        }

        // Use set with merge to handle documents that may not have teamResults field
        await contestRef.set({
            teamResults: teamResults,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        console.log(`Successfully added ${teams.length} teams to contest ${contestId}`);
        res.json({ success: true, message: `Added ${teams.length} teams to contest.` });
    } catch (error) {
        console.error("Error adding teams to contest:", error);
        res.status(500).json({ success: false, message: 'Server error when adding teams: ' + error.message });
    }
});

// Remove a team from a contest
app.delete('/contests/:contestId/teams/:teamId', async (req, res) => {
    const { contestId, teamId } = req.params;
    console.log('=== Received remove team from contest request ===', contestId, teamId);

    try {
        const contestRef = db.collection('contests').doc(contestId);
        const doc = await contestRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Contest not found.' });
        }

        const contestData = doc.data();
        const teamResults = contestData.teamResults || {};

        delete teamResults[teamId];

        await contestRef.update({
            teamResults: teamResults,
            updatedAt: new Date().toISOString()
        });

        res.json({ success: true, message: 'Team removed from contest.' });
    } catch (error) {
        console.error("Error removing team from contest:", error);
        res.status(500).json({ success: false, message: 'Server error when removing team.' });
    }
});

// ============================================
// CONTEST CRUD APIs
// ============================================

// GET all contests
app.get('/contests', async (req, res) => {
    console.log('=== Received get all contests request ===');
    try {
        const contestsRef = db.collection('contests');
        const snapshot = await contestsRef.orderBy('createdAt', 'desc').get();

        if (snapshot.empty) {
            return res.json({ success: true, data: [] });
        }

        const contests = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        res.json({ success: true, data: contests });
    } catch (error) {
        console.error("Error getting contests:", error);
        res.status(500).json({ success: false, message: 'Server error when getting contests.' });
    }
});

// GET single contest by ID
app.get('/contests/:id', async (req, res) => {
    const { id } = req.params;
    console.log('=== Received get contest request ===', id);
    try {
        const contestRef = db.collection('contests').doc(id);
        const doc = await contestRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Contest not found.' });
        }

        res.json({ success: true, data: { id: doc.id, ...doc.data() } });
    } catch (error) {
        console.error("Error getting contest:", error);
        res.status(500).json({ success: false, message: 'Server error when getting contest.' });
    }
});

// POST create new contest
app.post('/contests', async (req, res) => {
    const { name, description, date } = req.body;
    console.log('=== Received create contest request ===');

    if (!name) {
        return res.status(400).json({ success: false, message: 'Contest name is required.' });
    }

    try {
        const now = new Date().toISOString();
        const contestData = {
            name,
            description: description || '',
            date: date || now.split('T')[0],
            status: 'upcoming',
            teamResults: {}, // Empty map for team results
            createdAt: now,
            updatedAt: now
        };

        const docRef = await db.collection('contests').add(contestData);

        res.json({
            success: true,
            message: 'Contest created successfully.',
            data: { id: docRef.id, ...contestData }
        });
    } catch (error) {
        console.error("Error creating contest:", error);
        res.status(500).json({ success: false, message: 'Server error when creating contest.' });
    }
});

// PUT update existing contest
app.put('/contests/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, date, status } = req.body;
    console.log('=== Received update contest request ===', id);

    try {
        const contestRef = db.collection('contests').doc(id);
        const doc = await contestRef.get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Contest not found.' });
        }

        const updateData = {
            updatedAt: new Date().toISOString()
        };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (date !== undefined) updateData.date = date;
        if (status !== undefined) updateData.status = status;

        await contestRef.update(updateData);

        const updatedDoc = await contestRef.get();

        res.json({
            success: true,
            message: 'Contest updated successfully.',
            data: { id: updatedDoc.id, ...updatedDoc.data() }
        });
    } catch (error) {
        console.error("Error updating contest:", error);
        res.status(500).json({ success: false, message: 'Server error when updating contest.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server started and listening on http://localhost:${PORT}`);
});