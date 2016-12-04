import thinky from '../thinky';
const type = thinky.type;
const r = thinky.r;

const Comment = thinky.createModel('comment', {
  name: type.string(),
  comment: type.string(),
  postId: type.string(),
  date: type.date().default(r.now())
});

Comment.relations = () => {
  Comment.belongsTo(thinky.models.post, "post", "postId", "id");
}

Comment.ensureIndex("completed");

export default Comment;