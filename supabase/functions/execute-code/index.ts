import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, language } = await req.json();

    if (!code || !language) {
      return new Response(
        JSON.stringify({ error: 'Code and language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Executing ${language} code:`, code.substring(0, 100));

    // Use Piston API for code execution (free, no API key required)
    const pistonResponse = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        language: language === 'typescript' ? 'javascript' : language,
        version: '*',
        files: [
          {
            content: code,
          }
        ],
      }),
    });

    if (!pistonResponse.ok) {
      const errorText = await pistonResponse.text();
      console.error('Piston API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Code execution service unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await pistonResponse.json();
    console.log('Piston result:', result);

    // Combine stdout and stderr
    let output = '';
    if (result.run) {
      if (result.run.stdout) {
        output += result.run.stdout;
      }
      if (result.run.stderr) {
        if (output) output += '\n';
        output += result.run.stderr;
      }
      if (result.run.code !== 0 && !output) {
        output = `Exit code: ${result.run.code}`;
      }
    }

    if (result.compile?.stderr) {
      output = result.compile.stderr;
    }

    return new Response(
      JSON.stringify({ 
        output: output || 'No output',
        error: result.run?.code !== 0 ? output : null,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to execute code';
    console.error('Error executing code:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});