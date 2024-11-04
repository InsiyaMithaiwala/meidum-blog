import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { verify } from 'hono/jwt';

export const blogRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  },
  Variables: {
    userId: string;
  }
}>();

blogRouter.use("/*", async (c, next) => {
  const authHeader = c.req.header("authorization") || "";
  try {
      const user = await verify(authHeader, c.env.JWT_SECRET);
      if (user) {
        //@ts-ignore
          c.set("userId", user.id);
          await next();
      } else {
          c.status(403);
          return c.json({
              message: "You are not logged in"
          })
      }
  } catch(e) {
      c.status(403);
      return c.json({
          message: "You are not logged in"
      })
  }
});

blogRouter.post('/', async (c) => {
  const body = await c.req.json();
  // const { success } = createBlogInput.safeParse(body);
  // if (!success) {
  //     c.status(411);
  //     return c.json({
  //         message: "Inputs not correct"
  //     })
  // }

  const authorId = c.get("userId");
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate())

  const blog = await prisma.blog.create({
      data: {
          title: body.title,
          content: body.content,
          authorId: Number(authorId)
      }
  })

  return c.json({
      id: blog.id
  })
})

blogRouter.put('/', async (c) => {
  const body = await c.req.json();
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    //@ts-ignore
    const blog = await prisma.blog.update({
      where: { id: body.id },
      data: {
        title: body.title,
        content: body.content,
      }
    });
    return c.text("blog updated");
  } catch (error) {
    console.error("Error updating blog:", error);
    return c.json({ error: "Error updating blog" }, 500);
  }
});

blogRouter.get('/', async (c) => {
  const body = await c.req.json();
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    //@ts-ignore
    const blog = await prisma.blog.findFirst({
      where: { id: body.id }
    });
    if (!blog) {
      return c.json({ error: "Blog not found" }, 404);
    }
    return c.json({ blog });
  } catch (error) {
    console.error("Error fetching blog:", error);
    return c.json({ error: "Error fetching blog" }, 500);
  }
});

blogRouter.get('/bulk', async (c) => {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    //@ts-ignore
    const blogs = await prisma.blog.findMany();
    return c.json({ blogs });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return c.json({ error: "Error fetching blogs" }, 500);
  }
});