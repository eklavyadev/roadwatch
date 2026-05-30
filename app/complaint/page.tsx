'use client';

import { useState } from 'react';
import Navbar from '@/components/navbar';
import { EnvelopeIcon, GlobeAltIcon, MapPinIcon, BuildingOfficeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import pwdData from '@/all_india_pwd_road_authorities.json';

interface PwdAuthority {
  state_ut: string;
  authority_type: string;
  department_name: string;
  office_email: string;
  administrative_head_email: string;
  official_website: string;
}

export default function ComplaintPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const authorities: PwdAuthority[] = pwdData;

  const filteredAuthorities = authorities.filter((auth) =>
    auth.state_ut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    auth.department_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getMailtoLink = (email: string, state: string, department: string) => {
    const subject = encodeURIComponent(`Road Maintenance Complaint/Query - ${state}`);
    const body = encodeURIComponent(`To the ${department} of ${state},\n\nI am writing to report an issue regarding...`);
    return `mailto:${email}?subject=${subject}&body=${body}`;
  };

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <Navbar />

      <div className="pt-32 pb-20 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              File a <span className="text-cyan-400">Complaint</span>
            </h1>
            <p className="text-gray-400 max-w-2xl text-lg">
              Find the right authority to report road issues in your State or Union Territory. Email the officials directly with pre-filled templates.
            </p>
          </div>

          <div className="relative w-full md:w-96">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search by state or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg py-3 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all placeholder:text-gray-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuthorities.map((auth, index) => (
            <div
              key={index}
              className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-cyan-500/30 transition-all group flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold bg-cyan-500/10 px-3 py-1 rounded-full w-fit text-sm">
                  <MapPinIcon className="h-4 w-4" />
                  {auth.state_ut}
                </div>
                <span className="text-xs font-medium text-gray-500 bg-white/5 px-2 py-1 rounded">
                  {auth.authority_type}
                </span>
              </div>

              <div className="mb-6 flex-grow">
                <h3 className="text-xl font-bold mb-2 flex items-start gap-2">
                  <BuildingOfficeIcon className="h-5 w-5 mt-1 shrink-0 text-gray-400" />
                  {auth.department_name}
                </h3>
                {auth.official_website && (
                  <a
                    href={auth.official_website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-cyan-500 hover:text-cyan-400 flex items-center gap-1 w-fit"
                  >
                    <GlobeAltIcon className="h-4 w-4" />
                    Official Website
                  </a>
                )}
              </div>

              <div className="space-y-3 mt-auto">
                {auth.office_email && auth.office_email.trim() !== '' && (
                  <a
                    href={getMailtoLink(auth.office_email, auth.state_ut, auth.department_name)}
                    className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    Email Office
                  </a>
                )}
                {auth.administrative_head_email && auth.administrative_head_email.trim() !== '' && auth.administrative_head_email !== auth.office_email && (
                  <a
                    href={getMailtoLink(auth.administrative_head_email, auth.state_ut, auth.department_name)}
                    className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-[#020817] py-2.5 rounded-lg text-sm font-bold transition-colors"
                  >
                    <EnvelopeIcon className="h-4 w-4" />
                    Email Admin Head
                  </a>
                )}
              </div>
            </div>
          ))}

          {filteredAuthorities.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-500">
              <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg">No authorities found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
