import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('fabrics', 'routes/fabrics.tsx'),
  route('fabrics/:family', 'routes/family.tsx'),
  route('fabrics/:family/:product', 'routes/product.tsx'),
  route('shades', 'routes/shades.tsx'),
  route('shades/:shade', 'routes/shade.tsx'),
  route('applications', 'routes/applications.tsx'),
  route('applications/:application', 'routes/application.tsx'),
  route('material', 'routes/material.tsx'),
  route('about', 'routes/about.tsx'),
  route('wholesale', 'routes/wholesale.tsx'),
  route('samples', 'routes/samples.tsx'),
  route('samples/confirmation', 'routes/confirmation.tsx'),
  route('contact', 'routes/contact.tsx'),
  route('legal/:page', 'routes/legal.tsx'),
] satisfies RouteConfig;
