import models from '../db/models';
import ModelLoader from '../../../src/dataloader/modelLoader';

export default Object.keys(models).reduce((loadersObj, modelName) => {
  const modelLoader = new ModelLoader(models[modelName]);
  loadersObj[modelName] = modelLoader;
  return loadersObj;
}, {});