const kcbProvider = require('./kcbProvider');

const providers = {
  kcb: kcbProvider,
  // mpesa: require('./mpesaProvider'),
};

const getProvider = (name) => {
  const provider = providers[name];
  if (!provider) throw new Error(`[ProviderFactory] Unknown provider: ${name}`);
  return provider;
};

module.exports = { getProvider };