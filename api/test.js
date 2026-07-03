module.exports = (req, res) => {
    res.json({
        status: 'ok',
        message: 'API funcionando correctamente',
        method: req.method,
        timestamp: new Date().toISOString()
    });
};