# Dashboard Speaker Notes (2-Minute Presentation)

**[Slide/View: Project Overview]**
*(Time: ~30 seconds)*
"Welcome, everyone. Today we're excited to present our Interactive Data Synthesis Dashboard for the Manhattan Economic Housing Pulse project. Our primary research question was to understand how Manhattan apartment prices respond to varying macroeconomic regimes, and specifically, whether incorporating textual sentiment from FOMC communications improves our predictive accuracy. As you can see on the overview screen, we analyzed thousands of transactions. Our conclusion? Yes, incorporating regimes and sentiment is highly effective, pushing our Random Forest predictive R-squared to over 82%."

**[Slide/View: Macro & Sentiment + Economic Regimes]**
*(Time: ~40 seconds)*
"If we navigate to the 'Macro & Sentiment' tab, the line chart visualizes the historical relationship between the Federal Funds Rate and FOMC Polarity over time. Rather than looking at these variables in isolation, we used K-Means clustering to define unique 'Economic Regimes.' 
Moving to the 'Economic Regimes' tab, the scatter plot maps these regimes chronologically, while the radar chart breaks down their defining characteristics. You can see how each regime represents a distinct economic environment driven by factors like unemployment, inflation, and Fed sentiment."

**[Slide/View: Housing Segments]**
*(Time: ~30 seconds)*
"So, how does this impact housing? Let's look at the 'Housing Segments' tab. Here, we can filter by top Manhattan neighborhoods. The bar chart displays median sale prices on a log scale, grouped by regime and apartment size. Interestingly, we found that regimes alone don't cause a massive global shift in pricing. Instead, the *interaction* is what matters—specific sub-segments, like a 2-bedroom in TriBeCa, respond uniquely to different economic regimes."

**[Slide/View: Predictive Models]**
*(Time: ~20 seconds)*
"Finally, in our 'Predictive Models' tab, the data validates our approach. The RMSE comparison chart shows a clear improvement: our baseline macroeconomic model had an RMSE of around 0.458, but by adding Regimes and FOMC Sentiment, we dropped the error to 0.419. Looking at the feature importance chart, while physical attributes like the number of beds are dominant, macroeconomic factors like the Federal Funds rate are crucial drivers. 

Thank you, and we'd be happy to answer any questions."
