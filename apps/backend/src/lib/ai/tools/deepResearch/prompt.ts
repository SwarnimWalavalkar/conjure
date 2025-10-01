import dedent from "../../../../utils/dedent.js";

export default () => dedent`
This tool conducts comprehensive, autonomous research using web search and multi-step analysis. 

This tool:
- Automatically clarifies ambiguous requests
- Breaks down complex topics into focused research areas  
- Searches multiple web sources for current information
- Iteratively deepens research based on findings
- Synthesizes results into a detailed, well-cited report

Best for: Complex questions requiring in-depth analysis, current events, comparative studies, market research, technical deep-dives.

Important:
- If this tool previously returned a clarifying question, call it again after the user responds
- Successful research creates a detailed report - no need to repeat findings
`;
