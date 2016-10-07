import thinky from '../thinky';
const type = thinky.type;

const Author = thinky.createModel('author', {
  name: type.object().schema({
    first: type.string(),
    last: type.string()
  }),
  email: type.string(),
  website: type.string()
});

Author.relations = () => {
  Author.hasMany(thinky.models.post, "posts", "id", "authorId");
}


Author.ensureIndex("name");

export default Author;