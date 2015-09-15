// Select tweets with more than 5 retweets in Neo4j

MATCH (tweet:Tweet)<-[rt:Retweeted]-(:User)
WITH tweet, rt
MATCH (tweet)-[r]-(n)
WITH r, count(rt) as cnt
WHERE cnt > 5
RETURN r



// Export graph data from Neo4j for importing graphcommons

MATCH (tweet:Tweet)<-[rt:Retweeted]-(:User)
WITH tweet, rt
MATCH (tweet)-[r]-(n)
WITH r, count(rt) as cnt
WHERE cnt > 5

WITH r, startNode(r) as src, labels(startNode(r))[0] as src_lbl, endNode(r) as trg, labels(endNode(r))[0] as trg_lbl
RETURN 
src_lbl AS SRC_NODE_TYPE, 
CASE src_lbl 
	WHEN 'Tweet' THEN src.id 
	WHEN 'User' THEN src.screen_name
	ELSE src.text
END AS SRC_NODE_NAME,
type(r) AS EDGE_TYPE,
trg_lbl AS TRG_NODE_TYPE, 
CASE trg_lbl 
	WHEN 'Tweet' THEN trg.id 
	WHEN 'User' THEN trg.screen_name
	ELSE trg.text
END AS TRG_NODE_NAME,
1 as Weight



// Export node data from Neo4j for importing graphcommons 

MATCH (tweet:Tweet)<-[rt:Retweeted]-(:User)
WITH tweet, rt
MATCH (tweet)-[r]-(n)
WITH r, count(rt) as cnt
WHERE cnt > 5

WITH r, startNode(r) as src, labels(startNode(r))[0] as src_lbl, endNode(r) as trg, labels(endNode(r))[0] as trg_lbl
RETURN 
src_lbl AS Type, 
CASE src_lbl 
	WHEN 'Tweet' THEN src.id 
	WHEN 'User' THEN src.screen_name
	ELSE src.text
END AS Name,
CASE src_lbl
	WHEN 'Tweet' THEN src.text 
	WHEN 'User' THEN src.screen_name
	ELSE src.text
END AS Description,
'' as Image, 
src.ref AS Reference