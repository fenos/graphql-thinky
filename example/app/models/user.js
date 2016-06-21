import thinky from '../thinky';
const type = thinky.type;


const User = thinky.createModel('user', {
  name: type.string(),
});

User.relations = () => {
  User.hasMany(thinky.models.todo,'todos','id','user_id');
}

export default User;