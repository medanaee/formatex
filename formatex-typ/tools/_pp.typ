#import "/src/preprocess/pipeline.typ": preprocess
#let f = sys.inputs.at("f")
#metadata(preprocess(read("/" + f))) <out>
