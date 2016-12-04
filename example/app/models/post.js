import thinky from '../thinky';
const type = thinky.type;

const Post = thinky.createModel('post', {
  text: type.string(),
  picture: type.string(),
  tag: type.string(),
  authorId: type.string().allowNull(false),
});

Post.relations = () => {
  Post.belongsTo(thinky.models.author, "author", "authorId", "id");
  Post.hasMany(thinky.models.comment, "comments", "id", "postId");
};

Post.ensureIndex("date");

export default Post;