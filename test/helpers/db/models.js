import DB from './thinky';

const type = DB.type;

const User = DB.createModel('user', {
  name: type.string(),
  username: type.string(),
  virtualName: type.virtual().default(function() {
    return this.name+"Virtual";
  })
});

const Task = DB.createModel('task', {
  title: type.string(),
  completed: type.boolean(),
  assignee_id: type.string()
});

const Tag = DB.createModel('tag', {
  name: type.string(),
  description: type.string()
});

User.hasMany(Task,'tasks','id','assignee_id');

Task.hasAndBelongsToMany(Tag, "tags", "id", "id");
Tag.hasAndBelongsToMany(Task, "tasks", "id", "id");


export default {
  User,
  Task,
  Tag
};