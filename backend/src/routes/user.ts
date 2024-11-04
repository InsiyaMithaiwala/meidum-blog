import { Hono } from 'hono';
import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { sign } from 'hono/jwt';

export const userRouter = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JWT_SECRET: string;
  }
}>();

userRouter.post('/signup', async (c) => {
  const body = await c.req.json();

  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());


  try {
    // const existingUser = await prisma.user.findUnique({
    //   where: { username: body.username },
    // });
    // if (existingUser) {
    //   return c.json({ error: 'username is already registered.' }, 409);
    // }

    // Create a new user
    const user = await prisma.user.create({
      data: {
        username: body.username,
        password: body.password,
      },
    });

    
    const token = await sign({ 
      id: user.id 
    }, c.env.JWT_SECRET);

    return c.text(token);

  } catch (e) {
    console.log(e);
    c.status(411);
    return c.text('Internal server error');
  }
});

userRouter.post('/signin', async (c) => {
  const body = await c.req.json();
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());

  try {
    const user = await prisma.user.findFirst({
      where: {
        username: body.username,
        password: body.password, // Validate with hashed password in production
      }
    });

    if (!user) {
      c.status(403);
      return c.text("Incorrect credentials");
    }

    const token = await sign(
      { id: user.id },
      c.env.JWT_SECRET
    );

    return c.text(token);

  } catch (e) {
    console.log(e);
    return c.text('Internal server error');
  }
});