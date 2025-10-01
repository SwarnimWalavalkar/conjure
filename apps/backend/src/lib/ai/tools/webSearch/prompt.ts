import dedent from "../../../../utils/dedent.js";

export default () => dedent`
Use this tool to search the web for real-time information, current events, news, documentation, or any topic that requires up-to-date knowledge from the internet.

Capabilities:
  - Search the web using one or multiple specific queries to gather comprehensive information
  - Retrieve titles, URLs, and content snippets from relevant web sources
  - Automatically deduplicate results by URL across multiple queries
  - Get up to 10 results per query with configurable limits
  - Support for up to 5 concurrent search queries in a single tool call

Input Parameters:
  - searchQueries: Array of search query objects, each containing:
    - query: The specific search term or question (required)
    - maxResults: Number of results to return (1-10, defaults to 5)

Output Format:
  - Returns an array of search results, each containing:
    - title: The title of the web page
    - url: The full URL of the source
    - content: Relevant text content from the page
  - Results are deduplicated by URL across all queries
  - Provides a summary of total sources found

Use Cases:
  - Finding current information, news, or recent developments
  - Looking up technical documentation or API references
  - Researching topics that require multiple perspectives
  - Gathering data for analysis or comparison
  - Verifying facts or checking current status of projects/services

Best Practices:
  - Use specific, focused search queries for better results
  - When researching a topic, use multiple queries with different angles
  - Combine broad exploratory searches with specific targeted queries
  - Limit maxResults to what you actually need to avoid information overload
  - The search results may vary in quality - evaluate relevance carefully
`;
