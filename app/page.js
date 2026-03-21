"use client";

import Header from '@/components/Header';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Impact from '@/components/Impact';
import Founder from '@/components/Founder';
import BlogTeaser from '@/components/BlogTeaser';
import GalleryTeaser from '@/components/GalleryTeaser';
import DonateForm from '@/components/DonateForm';
import ContactVolunteer from '@/components/ContactVolunteer';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <Header />
      <Hero />
      <About />
      <Impact />
      <Founder />
      <BlogTeaser />
      <GalleryTeaser />
      <DonateForm />
      <ContactVolunteer />
      <Footer />
    </main>
  );
}
