import React from "react";
import Navbar from "../components/navbar";
import { ApprovedPotholes } from "@/components/ApprovedPotholes";

export default function HomePage() {
    return (
        <div>
            <Navbar />
            <section id="approved" className="bg-[#020817] px-6 py-20">
                <div className="mx-auto max-w-7xl">
                    <h2 className="text-3xl font-semibold text-white mb-2">
                        Verified Potholes
                    </h2>
                    <p className="text-gray-400 mb-10">
                        Recently approved road issues reported by citizens
                    </p>

                    <ApprovedPotholes />
                </div>
            </section>

        </div>
    );

}


