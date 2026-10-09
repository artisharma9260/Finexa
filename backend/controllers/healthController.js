export const getHealth = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Finexa API is running healthy',
    timestamp: new Date().toISOString()
  });
};
