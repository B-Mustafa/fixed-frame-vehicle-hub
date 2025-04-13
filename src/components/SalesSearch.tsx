
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { VehicleSale } from "@/utils/dataStorage";
import { Search, X, History } from "lucide-react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

const SEARCH_HISTORY_KEY = "salesSearchHistory";

interface SalesSearchProps {
  sales: VehicleSale[];
  setCurrentSale: (sale: VehicleSale) => void;
  setCurrentIndex: (index: number) => void;
  setPhotoPreview: (url: string | null) => void;
}

const SalesSearch: React.FC<SalesSearchProps> = ({
  sales,
  setCurrentSale,
  setCurrentIndex,
  setPhotoPreview,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<
    { query: string; timestamp: number }[]
  >([]);
  const [searchResults, setSearchResults] = useState<VehicleSale[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const loadSearchHistory = () => {
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as {
          query: string;
          timestamp: number;
        }[];
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const filteredHistory = parsedHistory.filter(
          (item) => item.timestamp >= oneDayAgo
        );

        if (filteredHistory.length !== parsedHistory.length) {
          localStorage.setItem(
            SEARCH_HISTORY_KEY,
            JSON.stringify(filteredHistory)
          );
        }

        setSearchHistory(filteredHistory);
      }
    };

    loadSearchHistory();
  }, []);

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const addToSearchHistory = (query: string) => {
    if (!query.trim()) return;

    const newItem = { query, timestamp: Date.now() };
    const existingIndex = searchHistory.findIndex(
      (item) => item.query.toLowerCase() === query.toLowerCase()
    );

    let updatedHistory;
    if (existingIndex >= 0) {
      updatedHistory = [...searchHistory];
      updatedHistory[existingIndex] = newItem;
    } else {
      updatedHistory = [newItem, ...searchHistory];
    }

    if (updatedHistory.length > 20) {
      updatedHistory = updatedHistory.slice(0, 20);
    }

    setSearchHistory(updatedHistory);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    addToSearchHistory(searchQuery);

    const searchLower = searchQuery.toLowerCase();
    const results = sales.filter(
      (sale) =>
        sale.party.toLowerCase().includes(searchLower) ||
        sale.vehicleNo.toLowerCase().includes(searchLower) ||
        sale.phone?.includes(searchLower) ||
        sale.model.toLowerCase().includes(searchLower) ||
        sale.chassis?.toLowerCase().includes(searchLower) ||
        sale.address.toLowerCase().includes(searchLower) ||
        sale.remark?.toLowerCase().includes(searchLower)
    );

    setSearchResults(results);
    setShowSearchResults(results.length > 0);

    if (results.length > 0) {
      const foundSale = results[0];
      const saleIndex = sales.findIndex((s) => s.id === foundSale.id);
      setCurrentSale(foundSale);
      setCurrentIndex(saleIndex);
      setPhotoPreview(foundSale.photoUrl || null);
      toast({
        title: "Search Results",
        description: `Found ${results.length} matching records`,
      });
    } else {
      toast({
        title: "No Results",
        description: "No matching records found",
      });
    }
  };

  return (
    <div className="flex relative mt-2">
      <Popover
        open={showSearchResults && searchResults.length > 0}
        onOpenChange={setShowSearchResults}
      >
        <div className="flex items-center">
          <div className="relative flex w-full items-center">
            <Input
              placeholder="Search by party, vehicle no, phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px] sm:min-w-[270px] pr-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={handleClearSearch}
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            onClick={handleSearch}
            className="ml-1"
            size="sm"
          >
            <Search className="h-4 w-4" />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="ml-1" size="sm">
                <History className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <div className="p-2">
                <h3 className="font-medium mb-1">Recent Searches</h3>
                {searchHistory.length === 0 ? (
                  <p className="text-sm text-gray-500">No recent searches</p>
                ) : (
                  <div className="flex flex-col space-y-1 max-h-[200px] overflow-y-auto">
                    {searchHistory.map((item, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        className="justify-start h-8 px-2 text-left"
                        onClick={() => {
                          setSearchQuery(item.query);
                          handleSearch();
                        }}
                      >
                        <span className="truncate">{item.query}</span>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <PopoverContent
          className="w-[350px] p-0"
          align="start"
          side="bottom"
        >
          <div className="p-2">
            <h3 className="font-medium mb-1">Search Results</h3>
            <div className="flex flex-col space-y-1 max-h-[300px] overflow-y-auto">
              {searchResults.map((result) => (
                <Button
                  key={result.id}
                  variant="ghost"
                  className="justify-start h-auto text-left py-2"
                  onClick={() => {
                    const index = sales.findIndex(
                      (s) => s.id === result.id
                    );
                    setCurrentSale(result);
                    setCurrentIndex(index);
                    setPhotoPreview(result.photoUrl || null);
                    setShowSearchResults(false);
                  }}
                >
                  <div className="flex flex-col w-full">
                    <span className="font-medium">{result.party}</span>
                    <span className="text-xs text-gray-500">
                      {result.vehicleNo} - {result.model}
                    </span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SalesSearch;
