import thinky from '../thinky';
const type = thinky.type;

const Todo = thinky.createModel('todo', {
  text: type.string(),
  completed: type.boolean(),
  user_id: type.string().allowNull(false)
});

Todo.relations = () => {
  Todo.belongsTo(thinky.models.user,'user','user_id','id');
}

export default Todo;