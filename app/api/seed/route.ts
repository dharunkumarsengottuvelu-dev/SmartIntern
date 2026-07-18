import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const sb = getSupabase();

    const internships = [
      {
        title: "Engineering Intern",
        company: "Qualcomm",
        description: "Mobile chipsets, 5G, and embedded systems",
        required_skills: ["C", "C++", "Embedded Systems", "5G", "DSP", "RTOS"],
        location: "Bangalore, India",
        duration: "3 months",
        stipend: "Paid",
        apply_link: "https://www.qualcomm.com/company/careers",
        is_active: true,
        category: "General",
      },
      {
        title: "Software Engineer Intern",
        company: "Adobe",
        description: "Creative Cloud, Document Cloud, and Experience Cloud products",
        required_skills: ["JavaScript", "React", "Node.js", "Python", "REST APIs", "Cloud"],
        location: "Bangalore, India",
        duration: "3 months",
        stipend: "Paid",
        apply_link: "https://www.adobe.com/careers.html",
        is_active: true,
        category: "General",
      },
      {
        title: "Developer Intern",
        company: "Salesforce",
        description: "CRM platform and enterprise cloud applications",
        required_skills: ["JavaScript", "Apex", "Java", "REST APIs", "SQL", "Cloud"],
        location: "Bangalore, India",
        duration: "3 months",
        stipend: "Paid",
        apply_link: "https://www.salesforce.com/company/careers/",
        is_active: true,
        category: "General",
      }
    ];

    const { data, error } = await sb.from("internships").insert(internships).select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Internships seeded successfully!", inserted: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
