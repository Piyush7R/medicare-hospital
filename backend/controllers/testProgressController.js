const db = require('../config/db');

// GET /appointments/:id/test-progress
// Returns the ordered test steps for an appointment with their current status
const getTestProgress = async (req, res) => {
    const { id } = req.params;
    try {
        // Verify appointment belongs to requesting user (patient) or is accessible (doctor/reception)
        const [appts] = await db.query('SELECT * FROM appointments WHERE id = ?', [id]);
        if (appts.length === 0) return res.status(404).json({ message: 'Appointment not found' });

        const appt = appts[0];

        // Get package test steps
        if (!appt.test_package_id) {
            return res.status(404).json({ message: 'No multi-step tests for this appointment' });
        }

        const [steps] = await db.query(
            `SELECT pt.*, 
        COALESCE(atp.status, 'pending') as status,
        atp.started_at,
        atp.completed_at,
        atp.id as progress_id
       FROM package_tests pt
       LEFT JOIN appointment_test_progress atp 
         ON atp.package_test_id = pt.id AND atp.appointment_id = ?
       WHERE pt.package_id = ?
       ORDER BY pt.step_number ASC`,
            [id, appt.test_package_id]
        );

        if (steps.length === 0) {
            return res.status(404).json({ message: 'No steps defined for this package' });
        }

        // If no progress rows exist yet and appointment is checked_in, auto-create them
        const hasProgress = steps.some(s => s.progress_id);
        if (!hasProgress && appt.payment_confirmed) {
            for (const step of steps) {
                await db.query(
                    'INSERT IGNORE INTO appointment_test_progress (appointment_id, package_test_id, status) VALUES (?, ?, ?)',
                    [id, step.id, 'pending']
                );
            }
            // Re-fetch with progress IDs
            const [refreshed] = await db.query(
                `SELECT pt.*, 
          COALESCE(atp.status, 'pending') as status,
          atp.started_at,
          atp.completed_at,
          atp.id as progress_id
         FROM package_tests pt
         LEFT JOIN appointment_test_progress atp 
           ON atp.package_test_id = pt.id AND atp.appointment_id = ?
         WHERE pt.package_id = ?
         ORDER BY pt.step_number ASC`,
                [id, appt.test_package_id]
            );
            return res.json(refreshed.map(s => ({ ...s, id: s.progress_id })));
        }

        res.json(steps.map(s => ({ ...s, id: s.progress_id })));
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /appointments/test-progress/:progressId/start
const startStep = async (req, res) => {
    const { progressId } = req.params;
    try {
        // Only allow starting if previous step is completed
        const [rows] = await db.query('SELECT * FROM appointment_test_progress WHERE id = ?', [progressId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Step not found' });

        const step = rows[0];

        // Check previous step
        const [pkg_step] = await db.query('SELECT * FROM package_tests WHERE id = ?', [step.package_test_id]);
        if (pkg_step[0].step_number > 1) {
            const [prevStep] = await db.query(
                `SELECT atp.status FROM appointment_test_progress atp
         JOIN package_tests pt ON atp.package_test_id = pt.id
         WHERE atp.appointment_id = ? AND pt.step_number = ? AND pt.package_id = ?`,
                [step.appointment_id, pkg_step[0].step_number - 1, pkg_step[0].package_id]
            );
            if (prevStep.length > 0 && prevStep[0].status !== 'completed') {
                return res.status(400).json({ message: 'Please complete the previous step first' });
            }
        }

        await db.query(
            'UPDATE appointment_test_progress SET status = "in_progress", started_at = NOW() WHERE id = ?',
            [progressId]
        );

        // Update appointment status to in_progress
        await db.query(
            'UPDATE appointments SET status = "in_progress" WHERE id = ?',
            [step.appointment_id]
        );

        res.json({ message: 'Step started' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /appointments/test-progress/:progressId/complete
const completeStep = async (req, res) => {
    const { progressId } = req.params;
    try {
        const [rows] = await db.query('SELECT * FROM appointment_test_progress WHERE id = ?', [progressId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Step not found' });

        const step = rows[0];

        await db.query(
            'UPDATE appointment_test_progress SET status = "completed", completed_at = NOW() WHERE id = ?',
            [progressId]
        );

        // Check if ALL steps for this appointment are now completed
        const [allSteps] = await db.query(
            `SELECT atp.status FROM appointment_test_progress atp
       JOIN package_tests pt ON atp.package_test_id = pt.id
       WHERE atp.appointment_id = ?`,
            [step.appointment_id]
        );

        const allDone = allSteps.every(s => s.status === 'completed');
        if (allDone) {
            await db.query(
                'UPDATE appointments SET status = "completed" WHERE id = ?',
                [step.appointment_id]
            );
            // Notify patient
            const [appt] = await db.query('SELECT * FROM appointments WHERE id = ?', [step.appointment_id]);
            if (appt.length > 0) {
                await db.query(
                    'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
                    [appt[0].patient_id, '🎉 All Tests Done!', 'All your tests are complete. Your report will be ready shortly.', 'appointment']
                );
            }
        }

        res.json({ message: 'Step completed', all_done: allDone });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// GET /admin/packages/:id/steps  — for admin to manage steps
const getPackageSteps = async (req, res) => {
    const { id } = req.params;
    try {
        const [steps] = await db.query(
            'SELECT * FROM package_tests WHERE package_id = ? ORDER BY step_number',
            [id]
        );
        res.json(steps);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// POST /admin/packages/:id/steps  — add a step
const addPackageStep = async (req, res) => {
    const { id } = req.params;
    const { step_number, test_name, room_number, duration_minutes, pre_requirements } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO package_tests (package_id, step_number, test_name, room_number, duration_minutes, pre_requirements) VALUES (?, ?, ?, ?, ?, ?)',
            [id, step_number, test_name, room_number, duration_minutes || 15, pre_requirements || null]
        );
        res.status(201).json({ message: 'Step added', id: result.insertId });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// DELETE /admin/packages/steps/:stepId
const deletePackageStep = async (req, res) => {
    const { stepId } = req.params;
    try {
        await db.query('DELETE FROM package_tests WHERE id = ?', [stepId]);
        res.json({ message: 'Step deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

module.exports = { getTestProgress, startStep, completeStep, getPackageSteps, addPackageStep, deletePackageStep };