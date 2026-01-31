import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Calendar, Shield, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppSelector } from '@/app/hooks';

/**
 * Home page - Landing page for BoxerConnect.
 * Displays hero section and feature highlights.
 */
export const HomePage: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  const features = [
    {
      icon: Users,
      title: 'Connect with Boxers',
      description:
        'Find and connect with boxers across all weight classes. Build your network in the boxing community.',
    },
    {
      icon: Calendar,
      title: 'Coordinate Matches',
      description:
        'Easily coordinate sparring sessions and competitive matches with detailed scheduling tools.',
    },
    {
      icon: Shield,
      title: 'Verified Profiles',
      description:
        'Trust our verification system to ensure you connect with legitimate athletes and professionals.',
    },
    {
      icon: Trophy,
      title: 'Track Records',
      description:
        'Maintain comprehensive fight records and statistics to showcase your boxing journey.',
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-boxing-navy py-20 text-white md:py-32">
        <div className="container relative z-10">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-extrabold tracking-tight md:text-6xl">
              Connect. Train. <span className="text-boxing-gold">Compete.</span>
            </h1>
            <p className="mb-8 text-lg text-gray-300 md:text-xl">
              BoxerConnect is the professional platform for boxers, coaches, and
              promoters to find matches, coordinate training, and grow their careers.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {isAuthenticated ? (
                <Button size="lg" asChild className="bg-boxing-red hover:bg-boxing-red/90">
                  <Link to="/dashboard">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Button size="lg" asChild className="bg-boxing-red hover:bg-boxing-red/90">
                    <Link to="/register">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="border-2 border-white text-white hover:bg-white hover:text-boxing-navy bg-white/10">
                    <Link to="/login">Sign In</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-boxing-navy via-boxing-navy to-boxing-red/20" />
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="mb-4 text-3xl font-bold tracking-tight md:text-4xl">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground">
              BoxerConnect provides all the tools you need to manage your boxing career
              and connect with the right people.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-boxing-red/10">
                  <feature.icon className="h-6 w-6 text-boxing-red" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t bg-muted/50 py-16">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">
              Ready to Step Into the Ring?
            </h2>
            <p className="mb-6 text-muted-foreground">
              Join thousands of boxers who are already using BoxerConnect to advance
              their careers.
            </p>
            {!isAuthenticated && (
              <Button size="lg" asChild>
                <Link to="/register">
                  Create Your Profile
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
