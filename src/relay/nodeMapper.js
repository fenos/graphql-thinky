
/*
|--------------------------------------------------------------------------
| Node Mapper
|--------------------------------------------------------------------------
| This instance allow to map the models with relay types
--------------------------------------------------------------------------*/
class NodeTypeMapper {
  constructor() {
    this.map = { };
  }

  mapTypes(types) {
    Object.entries(types).forEach(([k, v]) => {
      this.map[k] = v.type
          ? v
          : { type: v };
    });
  }

  item(type) {
    return this.map[type];
  }
}

export default NodeTypeMapper;