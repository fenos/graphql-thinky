import thinky from '../db/thinky';
import ModelLoader from '../../../src/dataloader/modelLoader';

const models = thinky.models;
export default Object.keys(models).reduce((loadersObj, modelName) => {
  modelName = models[modelName]._name;
  const model = models[modelName];
  const modelLoader = new ModelLoader(model);
  loadersObj[modelName] = modelLoader;
  return loadersObj;
}, {});