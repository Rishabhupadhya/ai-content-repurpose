import { useState } from 'react';

const PLATFORMS = ['linkedin', 'instagram', 'twitter', 'newsletter', 'seo'] as const;

type Status = 'idle' | 'loading' | 'success' | 'error';

export default function GenerateButtons({ contentId }: { contentId: string }) {
    const [status, setStatus] = useState<Record<string, Status>>({
        linkedin: 'idle',
        instagram: 'idle',
        twitter: 'idle',
        newsletter: 'idle',
        seo: 'idle'
    });

    const callGenerate = async (platform?: string) => {
        try {
            if (platform) {
                setStatus(s => ({ ...s, [platform]: 'loading' }));
            } else {
                // generate all
                setStatus({
                    linkedin: 'loading',
                    instagram: 'loading',
                    twitter: 'loading',
                    newsletter: 'loading',
                    seo: 'loading'
                });
            }

            const res = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    platform ? { id: contentId, platform } : { id: contentId }
                )
            });

            if (!res.ok) throw new Error('Generation failed');

            const data = await res.json();

            if (platform) {
                setStatus(s => ({ ...s, [platform]: 'success' }));
            } else {
                PLATFORMS.forEach(p => {
                    setStatus(s => ({ ...s, [p]: 'success' }));
                });
            }
        } catch (err) {
            console.error(err);
            if (platform) {
                setStatus(s => ({ ...s, [platform]: 'error' }));
            }
        }
    };

    const renderButton = (platform: string) => (
        <button
            key={platform}
            disabled={status[platform] === 'loading'}
            onClick={() => callGenerate(platform)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium
        ${status[platform] === 'success'
                    ? 'bg-green-100 text-green-700'
                    : status[platform] === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-white hover:bg-gray-50'
                }`}
        >
            {status[platform] === 'loading'
                ? `Generating ${platform}...`
                : status[platform] === 'success'
                    ? `✓ ${platform}`
                    : `Generate ${platform}`}
        </button>
    );

    return (
        <div className="space-y-4">
            {/* Generate All */}
            <button
                onClick={() => callGenerate()}
                className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-900"
            >
                Generate All Platforms
            </button>

            {/* Individual buttons */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {PLATFORMS.map(renderButton)}
            </div>
        </div>
    );
}
